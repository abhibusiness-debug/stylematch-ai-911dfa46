import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  User,
  Heart,
  Camera,
  Settings,
  ArrowRight,
} from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <ScrollReveal>
            <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-muted-foreground mb-10">Manage your profile, saved outfits, and preferences.</p>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            <ScrollReveal delay={0}>
              <DashCard icon={User} title="Profile" desc="Update your measurements and preferences." action="Edit Profile" />
            </ScrollReveal>
            <ScrollReveal delay={0.08}>
              <DashCard icon={Heart} title="Saved Outfits" desc="View your favorite outfit recommendations." count={0} action="View Saved" />
            </ScrollReveal>
            <ScrollReveal delay={0.16}>
              <DashCard icon={Camera} title="Upload New Photo" desc="Update your photo for fresh recommendations." action="Upload" />
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.2}>
            <div className="mt-12 gradient-primary rounded-2xl p-8 md:p-12 text-primary-foreground text-center">
              <h2 className="text-2xl font-bold mb-3">No outfits saved yet</h2>
              <p className="text-primary-foreground/80 mb-6">Generate your first AI-styled outfit to get started.</p>
              <Button variant="gold" size="lg" asChild>
                <Link to="/generator">Generate Outfits <ArrowRight className="h-5 w-5" /></Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const DashCard = ({
  icon: Icon,
  title,
  desc,
  count,
  action,
}: {
  icon: typeof User;
  title: string;
  desc: string;
  count?: number;
  action: string;
}) => (
  <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 h-full flex flex-col">
    <div className="gradient-primary rounded-xl p-3 w-fit mb-4">
      <Icon className="h-5 w-5 text-primary-foreground" />
    </div>
    <h3 className="font-display text-lg font-semibold mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground text-pretty mb-4 flex-1">{desc}</p>
    {count !== undefined && (
      <p className="text-2xl font-bold mb-4">{count}</p>
    )}
    <Button variant="outline" size="sm" className="w-fit">
      {action}
    </Button>
  </div>
);

export default Dashboard;
