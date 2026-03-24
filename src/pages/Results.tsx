import { useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  Heart,
  ShoppingBag,
  ExternalLink,
  ArrowLeft,
  Palette,
  Sparkles,
  RotateCcw,
  Loader2,
  User,
  Shirt,
  Eye,
  Brain,
} from "lucide-react";

interface OutfitItem {
  name: string;
  brand: string;
  price: string;
  category: string;
  searchQuery: string;
}

interface Outfit {
  id: number;
  name: string;
  occasion: string;
  colors: string[];
  items: OutfitItem[];
}

type TryOnStatus = "idle" | "uploading" | "loading" | "done" | "error";

interface TryOnResult {
  imageUrl: string;
  status: TryOnStatus;
  error?: string;
}

const GENERATION_STEPS = [
  { label: "Analyzing your profile", icon: User },
  { label: "AI styling your body type", icon: Brain },
  { label: "Matching colors to skin tone", icon: Palette },
  { label: "Curating personalized outfits", icon: Sparkles },
];

const TRYON_STEPS = [
  { label: "Uploading your photo", icon: User },
  { label: "Analyzing body proportions", icon: Eye },
  { label: "Fitting clothing to your body", icon: Shirt },
  { label: "Rendering final look", icon: Sparkles },
];

const Results = () => {
  const location = useLocation();
  const formData = location.state?.form;
  const userImage = location.state?.imagePreview;

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [generationStatus, setGenerationStatus] = useState<"loading" | "done" | "error">("loading");
  const [generationError, setGenerationError] = useState("");
  const [genStep, setGenStep] = useState(0);

  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [tryOnResults, setTryOnResults] = useState<Record<string, TryOnResult>>({});
  const [activeOutfitId, setActiveOutfitId] = useState<number | null>(null);
  const [tryOnStep, setTryOnStep] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<Record<number, number>>({});

  // Generate outfits via AI on mount
  useEffect(() => {
    if (!formData) return;

    const generate = async () => {
      const stepInterval = setInterval(() => {
        setGenStep((prev) => Math.min(prev + 1, GENERATION_STEPS.length - 1));
      }, 2000);

      try {
        const { data, error } = await supabase.functions.invoke("generate-outfits", {
          body: formData,
        });

        clearInterval(stepInterval);

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const generated = data?.outfits;
        if (!Array.isArray(generated) || generated.length === 0) {
          throw new Error("No outfits were generated");
        }

        setOutfits(generated);
        setGenerationStatus("done");
      } catch (err: unknown) {
        clearInterval(stepInterval);
        const msg = err instanceof Error ? err.message : "Failed to generate outfits";
        console.error("Generation error:", msg);
        setGenerationError(msg);
        setGenerationStatus("error");
      }
    };

    generate();
  }, [formData]);

  // Upload user image to storage
  useEffect(() => {
    if (!userImage) return;

    const uploadImage = async () => {
      try {
        const res = await fetch(userImage);
        const blob = await res.blob();
        const fileName = `tryon-${Date.now()}.jpg`;

        const { data, error } = await supabase.storage
          .from("user-images")
          .upload(fileName, blob, { contentType: "image/jpeg", upsert: true });

        if (error) {
          console.error("Upload error:", error);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("user-images")
          .getPublicUrl(data.path);

        setUserImageUrl(urlData.publicUrl);
      } catch (err) {
        console.error("Failed to upload user image:", err);
      }
    };

    uploadImage();
  }, [userImage]);

  const handleTryOn = async (outfitId: number, item: OutfitItem, itemIdx: number) => {
    if (!userImageUrl) return;

    const key = `${outfitId}-${itemIdx}`;
    setActiveOutfitId(outfitId);
    setSelectedItemIndex((prev) => ({ ...prev, [outfitId]: itemIdx }));
    setTryOnResults((prev) => ({ ...prev, [key]: { imageUrl: "", status: "loading" } }));
    setTryOnStep(0);

    const stepInterval = setInterval(() => {
      setTryOnStep((prev) => Math.min(prev + 1, TRYON_STEPS.length - 1));
    }, 1500);

    try {
      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          imageUrl: userImageUrl,
          clothDescription: `${item.name} by ${item.brand}`,
        },
      });

      clearInterval(stepInterval);
      if (error) throw error;

      const outputUrl =
        data?.result?.output ||
        data?.result?.output?.[0]?.url ||
        data?.result?.output?.[0] ||
        "";

      if (!outputUrl) throw new Error("No output image received");

      setTryOnResults((prev) => ({
        ...prev,
        [key]: { imageUrl: outputUrl, status: "done" },
      }));
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "Try-on failed";
      setTryOnResults((prev) => ({
        ...prev,
        [key]: { imageUrl: "", status: "error", error: msg },
      }));
    }
  };

  const getAffiliateUrl = (query: string) =>
    `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;

  // Loading state while AI generates outfits
  if (generationStatus === "loading") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full mx-auto px-4 space-y-8 text-center">
            <div>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">
                Creating Your <span className="gradient-text-primary">Perfect Outfits</span>
              </h2>
              <p className="text-muted-foreground text-sm">
                Our AI is analyzing your profile and curating personalized looks…
              </p>
            </div>
            <Progress value={((genStep + 1) / GENERATION_STEPS.length) * 100} className="h-2" />
            <div className="space-y-2">
              {GENERATION_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isDone = idx < genStep;
                const isCurrent = idx === genStep;
                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 text-sm rounded-lg px-4 py-2.5 transition-all duration-300 ${
                      isCurrent
                        ? "bg-primary/10 text-primary font-medium"
                        : isDone
                        ? "text-muted-foreground line-through opacity-60"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {step.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (generationStatus === "error") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="pt-24 pb-20 flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full mx-auto px-4 text-center space-y-6">
            <div className="bg-destructive/10 rounded-full p-4 w-fit mx-auto">
              <RotateCcw className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold">Generation Failed</h2>
            <p className="text-sm text-muted-foreground">{generationError}</p>
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
                  Your <span className="gradient-text-primary">AI-Styled Outfits</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {formData
                    ? `Personalized for ${formData.bodyType} build · ${formData.skinTone} tone · ${formData.occasion}`
                    : "AI-generated outfit recommendations"}
                </p>
              </div>
            </div>
          </ScrollReveal>

          {userImage && !userImageUrl && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-muted/50 rounded-xl border border-border/50">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm">Preparing your photo for virtual try-on…</p>
            </div>
          )}

          <div className="space-y-10">
            {outfits.map((outfit, i) => {
              const currentItemIdx = selectedItemIndex[outfit.id] ?? 0;
              const key = `${outfit.id}-${currentItemIdx}`;
              const tryOn = tryOnResults[key];
              const isActive = activeOutfitId === outfit.id;

              return (
                <ScrollReveal key={outfit.id} delay={i * 0.1}>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden hover:shadow-card-hover transition-[box-shadow] duration-300">
                    <div className="p-6 md:p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="font-display text-xl font-bold">{outfit.name}</h3>
                          <span className="text-xs text-muted-foreground">{outfit.occasion}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 mr-4">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            {outfit.colors.map((c) => (
                              <span
                                key={c}
                                className="h-5 w-5 rounded-full border border-border shadow-sm"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors group">
                            <Heart className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Left: Try-On Viewer */}
                        <div className="relative bg-muted/30 rounded-2xl border border-border/50 overflow-hidden min-h-[400px] flex items-center justify-center">
                          {tryOn?.status === "loading" && isActive ? (
                            <div className="p-8 w-full space-y-6">
                              <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                <p className="font-semibold text-sm">
                                  {TRYON_STEPS[tryOnStep]?.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  This usually takes 15–30 seconds
                                </p>
                              </div>
                              <Progress
                                value={((tryOnStep + 1) / TRYON_STEPS.length) * 100}
                                className="h-2"
                              />
                              <div className="space-y-2">
                                {TRYON_STEPS.map((step, idx) => {
                                  const Icon = step.icon;
                                  const isDone = idx < tryOnStep;
                                  const isCurrent = idx === tryOnStep;
                                  return (
                                    <div
                                      key={step.label}
                                      className={`flex items-center gap-3 text-xs rounded-lg px-3 py-2 transition-all duration-300 ${
                                        isCurrent
                                          ? "bg-primary/10 text-primary font-medium"
                                          : isDone
                                          ? "text-muted-foreground line-through opacity-60"
                                          : "text-muted-foreground/40"
                                      }`}
                                    >
                                      <Icon className="h-4 w-4 flex-shrink-0" />
                                      {step.label}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : tryOn?.status === "done" && tryOn.imageUrl ? (
                            <div className="relative w-full h-full">
                              <img
                                src={tryOn.imageUrl}
                                alt={`${outfit.name} try-on`}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-primary" />
                                AI Virtual Try-On
                              </div>
                            </div>
                          ) : tryOn?.status === "error" ? (
                            <div className="text-center p-6">
                              <p className="text-sm text-destructive mb-3">
                                {tryOn.error || "Try-on failed"}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleTryOn(outfit.id, outfit.items[currentItemIdx], currentItemIdx)
                                }
                              >
                                <RotateCcw className="h-4 w-4" />
                                Retry
                              </Button>
                            </div>
                          ) : (
                            <div className="text-center p-6">
                              {userImage ? (
                                <>
                                  <img
                                    src={userImage}
                                    alt="Your photo"
                                    className="w-32 h-40 object-cover rounded-xl mx-auto mb-4 opacity-50"
                                  />
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {userImageUrl
                                      ? "Select an item to try on"
                                      : "Uploading your photo…"}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <User className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                  <p className="text-sm text-muted-foreground">
                                    Upload a photo on the generator page to try on
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: Item Selector */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            {userImageUrl ? "Tap an item to try it on" : "Outfit items"}
                          </p>
                          {outfit.items.map((item, idx) => {
                            const itemKey = `${outfit.id}-${idx}`;
                            const itemTryOn = tryOnResults[itemKey];
                            const isSelected = currentItemIdx === idx && isActive;

                            return (
                              <div key={item.name} className="flex gap-2">
                                <button
                                  onClick={() => userImageUrl && handleTryOn(outfit.id, item, idx)}
                                  disabled={!userImageUrl || itemTryOn?.status === "loading"}
                                  className={`flex-1 text-left bg-muted/30 rounded-xl p-4 border transition-all duration-200 active:scale-[0.97] ${
                                    isSelected
                                      ? "border-primary shadow-md ring-1 ring-primary/20"
                                      : "border-border/50 hover:border-primary/30"
                                  } ${itemTryOn?.status === "loading" ? "opacity-60 cursor-wait" : ""} ${
                                    !userImageUrl ? "cursor-default" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground">{item.category}</p>
                                      <p className="text-sm font-semibold truncate">{item.name}</p>
                                      <div className="flex items-center justify-between mt-1">
                                        <p className="text-xs text-muted-foreground">{item.brand}</p>
                                        <p className="text-sm font-bold text-primary">{item.price}</p>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                                <a
                                  href={getAffiliateUrl(item.searchQuery)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center w-12 rounded-xl border border-border/50 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                                  title="Shop on Amazon"
                                >
                                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          <ScrollReveal delay={0.3}>
            <div className="text-center mt-12">
              <Button variant="hero" size="lg" asChild>
                <Link to="/generator">Generate New Outfits</Link>
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
