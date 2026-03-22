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
} from "lucide-react";

interface OutfitItem {
  name: string;
  brand: string;
  price: string;
  category: string;
  styleImageUrl: string;
}

interface Outfit {
  id: number;
  name: string;
  occasion: string;
  colors: string[];
  items: OutfitItem[];
}

// Real clothing image URLs from freely available sources
const mockOutfits: Outfit[] = [
  {
    id: 1,
    name: "Elegant Evening",
    occasion: "Formal",
    colors: ["#0f766e", "#d4af37", "#1e293b"],
    items: [
      {
        name: "Teal Silk Blazer",
        brand: "H&M",
        price: "₹3,499",
        category: "Outerwear",
        styleImageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80",
      },
      {
        name: "Gold Satin Skirt",
        brand: "Zara",
        price: "₹2,799",
        category: "Bottoms",
        styleImageUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=400&q=80",
      },
      {
        name: "Black Heeled Boots",
        brand: "Aldo",
        price: "₹5,999",
        category: "Footwear",
        styleImageUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=80",
      },
    ],
  },
  {
    id: 2,
    name: "Smart Casual",
    occasion: "Business",
    colors: ["#334155", "#14b8a6", "#f8fafc"],
    items: [
      {
        name: "Navy Chino Trousers",
        brand: "Uniqlo",
        price: "₹2,990",
        category: "Bottoms",
        styleImageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&q=80",
      },
      {
        name: "Teal Knit Polo",
        brand: "Mango",
        price: "₹1,999",
        category: "Tops",
        styleImageUrl: "https://images.unsplash.com/photo-1625910513413-5fc42af57706?w=400&q=80",
      },
      {
        name: "White Minimal Sneakers",
        brand: "Adidas",
        price: "₹4,299",
        category: "Footwear",
        styleImageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&q=80",
      },
    ],
  },
  {
    id: 3,
    name: "Weekend Relaxed",
    occasion: "Casual",
    colors: ["#d4af37", "#0f766e", "#f1f5f9"],
    items: [
      {
        name: "Olive Linen Shirt",
        brand: "Muji",
        price: "₹2,490",
        category: "Tops",
        styleImageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80",
      },
      {
        name: "Cream Wide-Leg Pants",
        brand: "COS",
        price: "₹3,990",
        category: "Bottoms",
        styleImageUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80",
      },
      {
        name: "Tan Leather Sandals",
        brand: "Birkenstock",
        price: "₹6,500",
        category: "Footwear",
        styleImageUrl: "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&q=80",
      },
    ],
  },
];

type TryOnStatus = "idle" | "uploading" | "loading" | "done" | "error";

interface TryOnResult {
  imageUrl: string;
  status: TryOnStatus;
  error?: string;
}

const PROCESSING_STEPS = [
  { label: "Uploading your photo", icon: User },
  { label: "Analyzing body proportions", icon: Eye },
  { label: "Fitting clothing to your body", icon: Shirt },
  { label: "Rendering final look", icon: Sparkles },
];

const Results = () => {
  const location = useLocation();
  const formData = location.state?.form;
  const userImage = location.state?.imagePreview; // base64 data URI

  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [tryOnResults, setTryOnResults] = useState<Record<string, TryOnResult>>({});
  const [activeOutfitId, setActiveOutfitId] = useState<number | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState<Record<number, number>>({});

  // Upload user image to storage on mount
  useEffect(() => {
    if (!userImage) return;

    const uploadImage = async () => {
      try {
        // Convert base64 to blob
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

        console.log("Uploaded user image:", urlData.publicUrl);
        setUserImageUrl(urlData.publicUrl);
      } catch (err) {
        console.error("Failed to upload user image:", err);
      }
    };

    uploadImage();
  }, [userImage]);

  // Auto-trigger try-on for first outfit once image is uploaded
  useEffect(() => {
    if (userImageUrl && mockOutfits.length > 0) {
      const firstOutfit = mockOutfits[0];
      const firstItem = firstOutfit.items[0];
      handleTryOn(firstOutfit.id, firstItem, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userImageUrl]);

  const handleTryOn = async (outfitId: number, item: OutfitItem, itemIdx: number) => {
    if (!userImageUrl) return;

    const key = `${outfitId}-${itemIdx}`;
    setActiveOutfitId(outfitId);
    setSelectedItemIndex((prev) => ({ ...prev, [outfitId]: itemIdx }));
    setTryOnResults((prev) => ({ ...prev, [key]: { imageUrl: "", status: "loading" } }));
    setProcessingStep(0);

    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => Math.min(prev + 1, PROCESSING_STEPS.length - 1));
    }, 1500);

    try {
      console.log("Invoking virtual-tryon with:", {
        imageUrl: userImageUrl,
        styleImageUrl: item.styleImageUrl,
      });

      const { data, error } = await supabase.functions.invoke("virtual-tryon", {
        body: {
          imageUrl: userImageUrl,
          styleImageUrl: item.styleImageUrl,
        },
      });

      clearInterval(stepInterval);

      if (error) throw error;

      console.log("Virtual try-on response:", JSON.stringify(data));

      // LightX returns output as a URL string in result.output
      const outputUrl =
        data?.result?.output ||
        data?.result?.output?.[0]?.url ||
        data?.result?.output?.[0] ||
        "";

      if (!outputUrl) {
        throw new Error("No output image received from try-on API");
      }

      setTryOnResults((prev) => ({
        ...prev,
        [key]: { imageUrl: outputUrl, status: "done" },
      }));
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const msg = err instanceof Error ? err.message : "Try-on failed";
      console.error("Try-on error:", msg);
      setTryOnResults((prev) => ({
        ...prev,
        [key]: { imageUrl: "", status: "error", error: msg },
      }));
    }
  };

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
                  Your <span className="gradient-text-primary">Virtual Try-On</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {formData
                    ? `${formData.bodyType} build · ${formData.skinTone} tone · ${formData.occasion}`
                    : "See outfits on your body"}
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Upload status */}
          {userImage && !userImageUrl && (
            <div className="flex items-center gap-3 mb-6 p-4 bg-muted/50 rounded-xl border border-border/50">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm">Preparing your photo for try-on…</p>
            </div>
          )}

          {/* Outfit Cards with Try-On */}
          <div className="space-y-10">
            {mockOutfits.map((outfit, i) => {
              const currentItemIdx = selectedItemIndex[outfit.id] ?? 0;
              const key = `${outfit.id}-${currentItemIdx}`;
              const tryOn = tryOnResults[key];
              const isActive = activeOutfitId === outfit.id;

              return (
                <ScrollReveal key={outfit.id} delay={i * 0.1}>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden hover:shadow-card-hover transition-[box-shadow] duration-300">
                    <div className="p-6 md:p-8">
                      {/* Header */}
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

                      {/* Try-On Viewer + Items */}
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Left: Try-On Viewer */}
                        <div className="relative bg-muted/30 rounded-2xl border border-border/50 overflow-hidden min-h-[400px] flex items-center justify-center">
                          {tryOn?.status === "loading" && isActive ? (
                            <div className="p-8 w-full space-y-6">
                              <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                                <p className="font-semibold text-sm">
                                  {PROCESSING_STEPS[processingStep]?.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  This usually takes 15–30 seconds
                                </p>
                              </div>
                              <Progress
                                value={((processingStep + 1) / PROCESSING_STEPS.length) * 100}
                                className="h-2"
                              />
                              <div className="space-y-2">
                                {PROCESSING_STEPS.map((step, idx) => {
                                  const Icon = step.icon;
                                  const isDone = idx < processingStep;
                                  const isCurrent = idx === processingStep;
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
                                    Upload a photo on the generator page first
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: Item Selector */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Tap an item to try it on
                          </p>
                          {outfit.items.map((item, idx) => {
                            const itemKey = `${outfit.id}-${idx}`;
                            const itemTryOn = tryOnResults[itemKey];
                            const isSelected = currentItemIdx === idx && isActive;

                            return (
                              <button
                                key={item.name}
                                onClick={() => handleTryOn(outfit.id, item, idx)}
                                disabled={!userImageUrl || itemTryOn?.status === "loading"}
                                className={`w-full text-left bg-muted/30 rounded-xl p-4 border transition-all duration-200 active:scale-[0.97] ${
                                  isSelected
                                    ? "border-primary shadow-md ring-1 ring-primary/20"
                                    : "border-border/50 hover:border-primary/30"
                                } ${itemTryOn?.status === "loading" ? "opacity-60 cursor-wait" : ""} ${
                                  !userImageUrl ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                    <img
                                      src={item.styleImageUrl}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                    <p className="text-sm font-semibold truncate">{item.name}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                                      <p className="text-sm font-bold text-primary">{item.price}</p>
                                    </div>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                </div>
                              </button>
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
