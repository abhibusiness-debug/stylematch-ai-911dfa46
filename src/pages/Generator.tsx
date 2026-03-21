import { useState, useCallback, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Button } from "@/components/ui/button";
import {
  Upload,
  X,
  Camera,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const genders = ["Male", "Female", "Non-Binary"];
const bodyTypes = ["Slim", "Athletic", "Average", "Curvy", "Plus Size"];
const skinTones = ["Fair", "Light", "Medium", "Olive", "Tan", "Brown", "Dark"];
const hairstyles = ["Short", "Medium", "Long", "Buzz Cut", "Curly", "Braids", "Bald"];
const occasions = ["Casual", "Formal", "Business", "Party", "Date Night", "Wedding", "Sports", "Travel"];

const Generator = () => {
  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [form, setForm] = useState({
    gender: "",
    height: "",
    bodyType: "",
    skinTone: "",
    hairstyle: "",
    occasion: "",
  });

  const handleImageChange = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files[0]) handleImageChange(e.dataTransfer.files[0]);
    },
    [handleImageChange]
  );

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleImageChange(e.target.files[0]);
  };

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isComplete =
    imagePreview && form.gender && form.height && form.bodyType && form.skinTone && form.occasion;

  const handleSubmit = () => {
    if (!isComplete) return;
    navigate("/results", { state: { form, imagePreview } });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-balance">
                Generate Your <span className="gradient-text-primary">Perfect Outfit</span>
              </h1>
              <p className="text-muted-foreground text-lg">
                Upload your photo and tell us about yourself for personalized AI styling.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="space-y-8">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold mb-3">Full Body Photo *</label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-muted max-w-xs mx-auto">
                    <img src={imagePreview} alt="Preview" className="w-full h-80 object-cover" />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute top-3 right-3 bg-foreground/70 text-background rounded-full p-1.5 hover:bg-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={onDrop}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                      dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                    onClick={() => document.getElementById("file-input")?.click()}
                  >
                    <div className="gradient-primary rounded-full p-4 w-fit mx-auto mb-4">
                      <Camera className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <p className="font-semibold text-sm mb-1">
                      Drag & drop your full body photo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      or click to browse · JPG, PNG up to 10MB
                    </p>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      onChange={onFileInput}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid sm:grid-cols-2 gap-6">
                <OptionGroup label="Gender *" options={genders} value={form.gender} onChange={(v) => setField("gender", v)} />
                <div>
                  <label className="block text-sm font-semibold mb-3">Height (cm) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 170"
                    value={form.height}
                    onChange={(e) => setField("height", e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <OptionGroup label="Body Type *" options={bodyTypes} value={form.bodyType} onChange={(v) => setField("bodyType", v)} />
                <OptionGroup label="Skin Tone *" options={skinTones} value={form.skinTone} onChange={(v) => setField("skinTone", v)} />
                <OptionGroup label="Hairstyle" options={hairstyles} value={form.hairstyle} onChange={(v) => setField("hairstyle", v)} />
                <OptionGroup label="Occasion *" options={occasions} value={form.occasion} onChange={(v) => setField("occasion", v)} />
              </div>

              <div className="pt-4">
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  disabled={!isComplete}
                  onClick={handleSubmit}
                >
                  <Sparkles className="h-5 w-5" />
                  Analyze & Generate Outfits
                  <ArrowRight className="h-5 w-5" />
                </Button>
                {!isComplete && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Please upload a photo and fill all required fields to continue.
                  </p>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const OptionGroup = ({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="block text-sm font-semibold mb-3">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all duration-200 active:scale-[0.96] ${
            value === opt
              ? "gradient-primary text-primary-foreground border-transparent shadow-card"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

export default Generator;
