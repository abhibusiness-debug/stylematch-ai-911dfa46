import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Camera,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ScanFace,
  Palette,
  Shirt,
  Star,
  CheckCircle2,
} from "lucide-react";
import heroImage from "@/assets/hero-fashion.jpg";

const features = [
  {
    icon: Camera,
    title: "Body Analysis",
    desc: "Upload a full-body photo and our AI analyzes proportions, posture, and skin tone for precise styling.",
  },
  {
    icon: ScanFace,
    title: "Smart Detection",
    desc: "Computer vision identifies your unique features to match outfits that genuinely complement you.",
  },
  {
    icon: Palette,
    title: "Color Science",
    desc: "Real skin tone detection powers color palette recommendations grounded in color theory.",
  },
  {
    icon: Shirt,
    title: "Outfit Curation",
    desc: "Receive 3–5 complete outfit combinations tailored to your body, occasion, and personal style.",
  },
  {
    icon: ShoppingBag,
    title: "Shop Instantly",
    desc: "Every recommended piece links directly to real products you can purchase immediately.",
  },
  {
    icon: Sparkles,
    title: "AI Styling Engine",
    desc: "Advanced AI combines visual analysis with fashion expertise for recommendations that actually work.",
  },
];

const steps = [
  { num: "01", title: "Upload Your Photo", desc: "Take or upload a full-body photo in good lighting." },
  { num: "02", title: "Share Your Preferences", desc: "Tell us the occasion, your style, and any preferences." },
  { num: "03", title: "AI Analyzes You", desc: "Our engine scans body shape, skin tone, and proportions." },
  { num: "04", title: "Get Your Outfits", desc: "Receive personalized outfits with shoppable product links." },
];

const testimonials = [
  { name: "Priya Sharma", role: "Marketing Director", text: "I was skeptical, but the AI genuinely understood my body type and picked colors I'd never have tried myself. Absolute game-changer.", rating: 5 },
  { name: "Daniel Okafor", role: "Software Engineer", text: "Finally, outfit advice that accounts for my actual proportions instead of generic size charts. The shopping links save so much time.", rating: 5 },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal>
              <div className="space-y-6 max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                  <Sparkles className="h-3.5 w-3.5" /> AI-Powered Fashion
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] text-balance">
                  Your Personal
                  <br />
                  <span className="gradient-text-primary">AI Stylist</span>
                </h1>
                <p className="text-lg text-muted-foreground text-pretty max-w-md">
                  Upload your photo. Our AI analyzes your body, skin tone, and proportions — then delivers outfit recommendations that genuinely fit you.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button variant="hero" size="xl" asChild>
                    <Link to="/generator">
                      Generate My Outfit <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="hero-outline" size="xl" asChild>
                    <Link to="#how-it-works">See How It Works</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> Free to try</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" /> No signup needed</span>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.2} direction="right">
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-elevated">
                  <img
                    src={heroImage}
                    alt="AI-curated fashion outfit flat lay with teal blazer and gold accessories"
                    className="w-full h-auto object-cover"
                    loading="eager"
                  />
                </div>
                <div className="absolute -bottom-4 -left-4 bg-card rounded-xl p-4 shadow-elevated border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="gradient-primary rounded-lg p-2">
                      <ScanFace className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Analysis Complete</p>
                      <p className="text-sm font-semibold">3 Outfits Generated</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Fashion Intelligence, <span className="gradient-text-primary">Not Guesswork</span>
              </h2>
              <p className="text-muted-foreground text-lg text-pretty">
                Combining computer vision and AI styling to understand what actually suits you.
              </p>
            </div>
          </ScrollReveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div className="group bg-card rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-[box-shadow] duration-300 border border-border/50 h-full">
                  <div className="gradient-primary rounded-xl p-3 w-fit mb-4 group-hover:scale-105 transition-transform duration-300">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32 bg-muted/30">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Four Steps to Your <span className="gradient-text-primary">Perfect Outfit</span>
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <ScrollReveal key={s.num} delay={i * 0.1}>
                <div className="relative">
                  <span className="text-6xl font-display font-bold text-primary/10">{s.num}</span>
                  <h3 className="font-display text-lg font-semibold mt-2 mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{s.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-balance">
              What People Are <span className="gradient-text-primary">Saying</span>
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.1} direction={i === 0 ? "left" : "right"}>
                <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 text-pretty leading-relaxed">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4">
          <ScrollReveal>
            <div className="gradient-primary rounded-3xl p-12 md:p-16 text-center text-primary-foreground">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Ready to Discover Your Style?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-lg mx-auto text-pretty">
                Upload your photo and let AI create outfits made for your unique body and features.
              </p>
              <Button variant="gold" size="xl" asChild>
                <Link to="/generator">
                  Get Styled Now <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
