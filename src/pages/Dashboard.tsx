import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  User,
  Heart,
  Camera,
  ArrowRight,
  Sparkles,
  Shirt,
  Loader2,
} from "lucide-react";

interface SavedOutfit {
  id: string;
  outfit_name: string;
  occasion: string;
  colors: string[];
  items: any[];
  try_on_image_url: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [outfits, setOutfits] = useState<SavedOutfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchOutfits = async () => {
      const { data } = await supabase
        .from("generated_outfits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOutfits((data as SavedOutfit[]) || []);
      setLoading(false);
    };
    fetchOutfits();
  }, [user]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold mb-2">
              Welcome, <span className="gradient-text-primary">{user?.user_metadata?.full_name || "Stylist"}</span>
            </h1>
            <p className="text-muted-foreground mb-10">Your saved outfits and style history.</p>
          </ScrollReveal>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : outfits.length === 0 ? (
            <ScrollReveal>
              <div className="gradient-primary rounded-2xl p-8 md:p-12 text-primary-foreground text-center">
                <Shirt className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <h2 className="text-2xl font-bold mb-3">No outfits saved yet</h2>
                <p className="text-primary-foreground/80 mb-6">
                  Generate your first AI-styled outfit to get started.
                </p>
                <Button variant="gold" size="lg" asChild>
                  <Link to="/generator">
                    Generate Outfits <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {outfits.map((outfit, idx) => (
                <ScrollReveal key={outfit.id} delay={idx * 0.05}>
                  <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden group hover:shadow-elevated transition-shadow">
                    {outfit.try_on_image_url ? (
                      <div className="aspect-[3/4] bg-muted/20 overflow-hidden">
                        <img
                          src={outfit.try_on_image_url}
                          alt={outfit.outfit_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-muted/20 flex items-center justify-center">
                        <Shirt className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {outfit.colors?.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <h3 className="font-semibold text-sm">{outfit.outfit_name}</h3>
                      <p className="text-xs text-muted-foreground">{outfit.occasion}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(outfit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          <ScrollReveal delay={0.2}>
            <div className="text-center mt-12">
              <Button variant="hero" size="lg" asChild>
                <Link to="/generator">
                  <Sparkles className="h-4 w-4" /> Generate New Looks
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

export default Dashboard;
