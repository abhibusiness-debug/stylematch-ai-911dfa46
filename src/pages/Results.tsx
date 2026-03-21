import { useLocation, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import {
  Heart,
  ShoppingBag,
  ExternalLink,
  ArrowLeft,
  Palette,
  Sparkles,
} from "lucide-react";

const mockOutfits = [
  {
    id: 1,
    name: "Elegant Evening",
    occasion: "Formal",
    colors: ["#0f766e", "#d4af37", "#1e293b"],
    items: [
      { name: "Teal Silk Blazer", brand: "H&M", price: "₹3,499", category: "Outerwear" },
      { name: "Gold Satin Skirt", brand: "Zara", price: "₹2,799", category: "Bottoms" },
      { name: "Black Heeled Boots", brand: "Aldo", price: "₹5,999", category: "Footwear" },
    ],
  },
  {
    id: 2,
    name: "Smart Casual",
    occasion: "Business",
    colors: ["#334155", "#14b8a6", "#f8fafc"],
    items: [
      { name: "Navy Chino Trousers", brand: "Uniqlo", price: "₹2,990", category: "Bottoms" },
      { name: "Teal Knit Polo", brand: "Mango", price: "₹1,999", category: "Tops" },
      { name: "White Minimal Sneakers", brand: "Adidas", price: "₹4,299", category: "Footwear" },
    ],
  },
  {
    id: 3,
    name: "Weekend Relaxed",
    occasion: "Casual",
    colors: ["#d4af37", "#0f766e", "#f1f5f9"],
    items: [
      { name: "Olive Linen Shirt", brand: "Muji", price: "₹2,490", category: "Tops" },
      { name: "Cream Wide-Leg Pants", brand: "COS", price: "₹3,990", category: "Bottoms" },
      { name: "Tan Leather Sandals", brand: "Birkenstock", price: "₹6,500", category: "Footwear" },
    ],
  },
];

const Results = () => {
  const location = useLocation();
  const formData = location.state?.form;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/generator"><ArrowLeft className="h-5 w-5" /></Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">
                  Your <span className="gradient-text-primary">AI-Styled</span> Outfits
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {formData
                    ? `Based on your profile: ${formData.bodyType} build, ${formData.skinTone} tone, ${formData.occasion} occasion`
                    : "Personalized outfit recommendations"}
                </p>
              </div>
            </div>
          </ScrollReveal>

          {/* Analysis Summary */}
          <ScrollReveal delay={0.05}>
            <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="gradient-primary rounded-lg p-2">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <h2 className="font-display text-lg font-semibold">AI Analysis Summary</h2>
              </div>
              <div className="grid sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground text-xs mb-1">Body Proportion</p>
                  <p className="font-semibold">Balanced</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground text-xs mb-1">Detected Skin Tone</p>
                  <p className="font-semibold">{formData?.skinTone || "Medium"}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground text-xs mb-1">Posture</p>
                  <p className="font-semibold">Upright</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground text-xs mb-1">Fit Recommendation</p>
                  <p className="font-semibold">Regular</p>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Outfit Cards */}
          <div className="space-y-8">
            {mockOutfits.map((outfit, i) => (
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

                    <div className="grid sm:grid-cols-3 gap-4">
                      {outfit.items.map((item) => (
                        <div
                          key={item.name}
                          className="bg-muted/30 rounded-xl p-4 border border-border/50 group hover:border-primary/30 transition-colors"
                        >
                          <div className="w-full h-32 rounded-lg bg-muted mb-3 flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                          <p className="text-xs text-muted-foreground">{item.category}</p>
                          <p className="text-sm font-semibold mt-0.5">{item.name}</p>
                          <div className="flex items-center justify-between mt-2">
                            <div>
                              <p className="text-xs text-muted-foreground">{item.brand}</p>
                              <p className="text-sm font-bold text-primary">{item.price}</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs">
                              Buy <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
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
