import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export const Footer = () => (
  <footer className="border-t border-border bg-muted/30 py-16">
    <div className="container mx-auto px-4">
      <div className="grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="gradient-primary rounded-lg p-1.5">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">StyleMatch AI</span>
          </Link>
          <p className="text-muted-foreground text-sm max-w-sm text-pretty">
            AI-powered fashion intelligence that analyzes your unique features to deliver
            perfectly personalized outfit recommendations.
          </p>
        </div>
        <div>
          <h4 className="font-body font-semibold text-sm mb-4">Platform</h4>
          <ul className="space-y-2.5">
            {["Style Generator", "How It Works", "Pricing"].map((t) => (
              <li key={t}>
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-body font-semibold text-sm mb-4">Company</h4>
          <ul className="space-y-2.5">
            {["About", "Blog", "Contact", "Privacy"].map((t) => (
              <li key={t}>
                <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} StyleMatch AI. All rights reserved.
      </div>
    </div>
  </footer>
);
