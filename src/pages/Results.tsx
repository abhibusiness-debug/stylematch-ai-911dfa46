import { useLocation, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  ShoppingBag,
  ArrowLeft,
  Palette,
  Sparkles,
  RotateCcw,
  Loader2,
  User,
  Shirt,
  Eye,
  Brain,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface OutfitItem {
  name: string;
  brand: string;
  price: string;
  category: string;
  searchQueryFlipkart: string;
  searchQueryMyntra: string;
  generatedImageUrl?: string;
}

interface Outfit {
  id: number;
  name: string;
  occasion: string;
  colors: string[];
  fullOutfitDescription?: string;
  items: OutfitItem[];
}

type PipelineStage =
  | "generating-outfits"
  | "generating-images"
  | "trying-on"
  | "done"
  | "error";

const PIPELINE_STEPS = [
  { key: "generating-outfits", label: "AI is analyzing your style profile", icon: Brain },
  { key: "generating-images", label: "Creating full outfit visuals", icon: Shirt },
  { key: "trying-on", label: "Fitting complete outfits onto your body", icon: Eye },
  { key: "done", label: "Your styled looks are ready!", icon: Sparkles },
];

const Results = () => {
  const location = useLocation();
  const formData = location.state?.form;
  const userImage = location.state?.imagePreview;

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [stage, setStage] = useState<PipelineStage>("generating-outfits");
  const [errorMsg, setErrorMsg] = useState("");
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [tryOnImages, setTryOnImages] = useState<Record<number, string>>({});
  const [activeOutfit, setActiveOutfit] = useState(0);
  const [progress, setProgress] = useState(5);
  const [profileId, setProfileId] = useState<string | null>(null);
  const pipelineRan = useRef(false);

  const getFlipkartUrl = (query: string) =>
    `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

  const getMyntraUrl = (query: string) =>
    `https://www.myntra.com/${encodeURIComponent(query.replace(/\s+/g, '-'))}`;

  // Full pipeline
  useEffect(() => {
    if (!formData || !userImage || pipelineRan.current) return;
    pipelineRan.current = true;

    const run = async () => {
      try {
        // --- Stage 1: Upload user image ---
        setProgress(5);
        const imgRes = await fetch(userImage);
        const blob = await imgRes.blob();
        const fileName = `tryon-${Date.now()}.jpg`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("user-images")
          .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });
        if (uploadErr) throw new Error("Failed to upload your photo");
        const { data: urlData } = supabase.storage
          .from("user-images")
          .getPublicUrl(uploadData.path);
        const uploadedUserUrl = urlData.publicUrl;
        setUserImageUrl(uploadedUserUrl);
        setProgress(10);

        // Save user profile to database
        const { data: profileData } = await supabase
          .from("user_profiles")
          .insert({
            gender: formData.gender,
            height: formData.height || null,
            body_type: formData.bodyType,
            skin_tone: formData.skinTone || null,
            hairstyle: formData.hairstyle || null,
            occasion: formData.occasion,
            user_image_url: uploadedUserUrl,
          })
          .select("id")
          .single();

        if (profileData) setProfileId(profileData.id);

        // --- Stage 2: Generate outfits ---
        setStage("generating-outfits");
        const { data: outfitData, error: outfitErr } = await supabase.functions.invoke(
          "generate-outfits",
          { body: formData }
        );
        if (outfitErr) throw outfitErr;
        if (outfitData?.error) throw new Error(outfitData.error);
        const generated: Outfit[] = outfitData?.outfits;
        if (!Array.isArray(generated) || generated.length === 0)
          throw new Error("No outfits generated");
        setOutfits(generated);
        setProgress(30);

        // --- Stage 3: Generate FULL outfit images (top + bottom + shoes) ---
        setStage("generating-images");
        const updatedOutfits = [...generated];

        const imagePromises = generated.map(async (outfit, oi) => {
          // Build a complete outfit description for full-body image generation
          const fullDescription = outfit.fullOutfitDescription ||
            outfit.items.map(item => `${item.name} (${item.category})`).join(", ");

          try {
            const { data, error } = await supabase.functions.invoke(
              "generate-clothing-image",
              {
                body: {
                  description: fullDescription,
                  outfitId: outfit.id,
                  itemIndex: 0,
                },
              }
            );
            if (!error && data?.imageUrl) {
              updatedOutfits[oi] = {
                ...updatedOutfits[oi],
                items: updatedOutfits[oi].items.map((item, ii) =>
                  ii === 0 ? { ...item, generatedImageUrl: data.imageUrl } : item
                ),
              };
            }
          } catch (e) {
            console.error(`Failed to generate image for outfit ${outfit.id}:`, e);
          }
          setProgress(30 + ((oi + 1) / generated.length) * 30);
        });

        await Promise.all(imagePromises);
        setOutfits(updatedOutfits);
        setProgress(60);

        // --- Stage 4: Virtual try-on for each outfit (full body) ---
        setStage("trying-on");
        const tryOnPromises = updatedOutfits.map(async (outfit, oi) => {
          const itemWithImage = outfit.items.find((it) => it.generatedImageUrl);
          if (!itemWithImage?.generatedImageUrl) return;

          try {
            const { data, error } = await supabase.functions.invoke("virtual-tryon", {
              body: {
                imageUrl: uploadedUserUrl,
                styleImageUrl: itemWithImage.generatedImageUrl,
              },
            });
            if (!error && data) {
              const outputUrl =
                data?.result?.output ||
                data?.result?.output?.[0]?.url ||
                data?.result?.output?.[0] ||
                "";
              if (outputUrl) {
                setTryOnImages((prev) => ({ ...prev, [outfit.id]: outputUrl }));

                // Save outfit to database
                if (profileData?.id) {
                  await supabase.from("generated_outfits").insert({
                    profile_id: profileData.id,
                    outfit_name: outfit.name,
                    occasion: outfit.occasion,
                    colors: outfit.colors,
                    items: outfit.items as any,
                    try_on_image_url: outputUrl,
                  });
                }
              }
            }
          } catch (e) {
            console.error(`Try-on failed for outfit ${outfit.id}:`, e);
          }
          setProgress(60 + ((oi + 1) / updatedOutfits.length) * 35);
        });

        await Promise.all(tryOnPromises);
        setProgress(100);
        setStage("done");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        console.error("Pipeline error:", msg);
        setErrorMsg(msg);
        setStage("error");
      }
    };

    run();
  }, [formData, userImage]);

  const currentStageIdx = PIPELINE_STEPS.findIndex((s) => s.key === stage);

  // Loading state
  if (stage !== "done" && stage !== "error") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-lg w-full mx-auto px-4 space-y-8 text-center">
            <div>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">
                Styling Your <span className="gradient-text-primary">Perfect Look</span>
              </h2>
              <p className="text-muted-foreground text-sm">
                This takes about 1–2 minutes. We're generating outfits and fitting them to your body.
              </p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
            <div className="space-y-2">
              {PIPELINE_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 text-sm rounded-lg px-4 py-2.5 transition-all duration-300 ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : isDone
                        ? "text-muted-foreground line-through opacity-60"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    ) : (
                      <Icon className="h-4 w-4 flex-shrink-0" />
                    )}
                    {step.label}
                  </div>
                );
              })}
            </div>

            {outfits.length > 0 && (
              <div className="mt-6 text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Outfits being prepared:
                </p>
                {outfits.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 text-sm rounded-lg px-4 py-2 bg-muted/30 mb-1"
                  >
                    <div className="flex gap-1">
                      {o.colors.map((c) => (
                        <span
                          key={c}
                          className="h-3 w-3 rounded-full border border-border"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <span className="font-medium">{o.name}</span>
                    {tryOnImages[o.id] && (
                      <Sparkles className="h-3 w-3 text-primary ml-auto" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (stage === "error") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full mx-auto px-4 text-center space-y-6">
            <div className="bg-destructive/10 rounded-full p-4 w-fit mx-auto">
              <RotateCcw className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Something Went Wrong</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link to="/generator">
                  <ArrowLeft className="h-4 w-4" /> Go Back
                </Link>
              </Button>
              <Button variant="hero" onClick={() => window.location.reload()}>
                <RotateCcw className="h-4 w-4" /> Retry
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ===== Done: Show results =====
  const outfit = outfits[activeOutfit];
  const tryOnImage = outfit ? tryOnImages[outfit.id] : null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <ScrollReveal>
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/generator">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  Your <span className="gradient-text-primary">AI-Styled Looks</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {formData
                    ? `Personalized for ${formData.bodyType} build · ${formData.skinTone} tone · ${formData.occasion}`
                    : "AI-generated outfit recommendations"}
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Outfit selector tabs */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {outfits.map((o, idx) => (
              <button
                key={o.id}
                onClick={() => setActiveOutfit(idx)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
                  idx === activeOutfit
                    ? "gradient-primary text-primary-foreground border-transparent shadow-card"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex gap-1">
                  {o.colors.slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="h-3 w-3 rounded-full border border-border/50"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                {o.name}
              </button>
            ))}
          </div>

          {outfit && (
            <div className="grid lg:grid-cols-5 gap-8">
              {/* Left: Try-On Image */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
                  <div className="relative aspect-[3/4] bg-muted/20 flex items-center justify-center">
                    {tryOnImage ? (
                      <>
                        <img
                          src={tryOnImage}
                          alt={`${outfit.name} on you`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">AI Virtual Try-On</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-8">
                        <img
                          src={userImage}
                          alt="Your photo"
                          className="w-48 h-60 object-cover rounded-xl mx-auto mb-4 opacity-40"
                        />
                        <p className="text-sm text-muted-foreground">
                          Virtual try-on couldn't be generated for this outfit.
                          <br />
                          Your photo is shown as a reference.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Navigation arrows */}
                  <div className="flex items-center justify-between p-4 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={activeOutfit === 0}
                      onClick={() => setActiveOutfit((prev) => prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous Look
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      Look {activeOutfit + 1} of {outfits.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={activeOutfit === outfits.length - 1}
                      onClick={() => setActiveOutfit((prev) => prev + 1)}
                    >
                      Next Look <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Outfit details & items */}
              <div className="lg:col-span-2 space-y-5">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold">{outfit.name}</h2>
                      <p className="text-sm text-muted-foreground">{outfit.occasion}</p>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors group">
                      <Heart className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mr-1">Color palette:</span>
                    {outfit.colors.map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-full border border-border shadow-sm"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Outfit Items
                  </p>
                  {outfit.items.map((item, idx) => (
                    <div
                      key={`${item.name}-${idx}`}
                      className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden hover:border-primary/30 transition-colors"
                    >
                      <div className="flex gap-3 p-3">
                        {item.generatedImageUrl ? (
                          <img
                            src={item.generatedImageUrl}
                            alt={item.name}
                            className="w-20 h-20 rounded-lg object-cover border border-border/50 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border/50">
                            <Shirt className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {item.category}
                          </p>
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.brand}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-sm font-bold text-primary">{item.price}</p>
                            <div className="flex gap-2">
                              <a
                                href={getFlipkartUrl(item.searchQueryFlipkart)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                              >
                                <ShoppingBag className="h-3 w-3" />
                                Flipkart
                              </a>
                              <a
                                href={getMyntraUrl(item.searchQueryMyntra)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] font-medium text-accent-foreground hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Myntra
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shop buttons */}
                <div className="flex gap-3">
                  <Button variant="hero" className="flex-1" asChild>
                    <a
                      href={getFlipkartUrl(
                        outfit.items.map((i) => i.searchQueryFlipkart).join(" ")
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Shop on Flipkart
                    </a>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <a
                      href={getMyntraUrl(
                        outfit.items.map((i) => i.searchQueryMyntra).join(" ")
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Shop on Myntra
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ScrollReveal delay={0.2}>
            <div className="text-center mt-12">
              <Button variant="outline" size="lg" asChild>
                <Link to="/generator">
                  <RotateCcw className="h-4 w-4" /> Generate New Looks
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Results;
