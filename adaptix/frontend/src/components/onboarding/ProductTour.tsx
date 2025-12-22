"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const STEPS = [
  {
    title: "Welcome to Adaptix 2.0! 🚀",
    content:
      "We've rebuilt the platform with AI Superpowers. Let's take a 30-second tour of the new capabilities.",
    target: null, // Center modal
  },
  {
    title: "AI Risk Radar 🧠",
    content:
      "This card isn't just a number. It's an intelligent risk detector. Click it to see the NEW 'Stockout Deep Dive' visualization.",
    target: "stats-widget-ai", // ID we will add to the widget
  },
  {
    title: "Velocity Engine 📈",
    content:
      "We now track sales acceleration in real-time. See which products are 'Heating Up' before they run out.",
    target: "sales-trend-widget",
  },
  {
    title: "Warp Speed POS ⚡",
    content:
      "Need to sell fast? The new POS workflow is keyboard-optimized and 40% faster.",
    target: "quick-action-pos",
  },
];

export function ProductTour() {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Check if user has seen tour
    const hasSeen = localStorage.getItem("adaptix_tour_seen");
    if (!hasSeen) {
      // Small delay to let animations finish
      setTimeout(() => setOpen(true), 1500);
    }
  }, []);

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem("adaptix_tour_seen", "true");
  };

  const currentStep = STEPS[stepIndex];

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={handleClose}>
          {/* We use a custom overlayless approach or just standard dialog for simplicity in this MVP */}
          <DialogContent className="sm:max-w-[400px] border-l-4 border-l-indigo-500">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">{currentStep.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {currentStep.content}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-1">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i === stepIndex ? "bg-indigo-600" : "bg-indigo-200"
                      }`}
                    />
                  ))}
                </div>
                <Button size="sm" onClick={handleNext} className="gap-2">
                  {stepIndex === STEPS.length - 1 ? (
                    <>
                      Finish <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
