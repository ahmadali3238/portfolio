"use client";

// src/components/CertificateCarousel.tsx

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface CertificateCarouselProps {
  certificates: {
    image: any;
    title: string;
    description: string;
  }[];
}

const CertificateCarousel = ({ certificates }: CertificateCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () =>
    setCurrentIndex((prev) => (prev + 1) % certificates.length);
  const prevSlide = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + certificates.length) % certificates.length
    );
  const goToSlide = (index: number) => setCurrentIndex(index);

  return (
    <div className="w-full">
      <Card className="w-full overflow-hidden bg-gradient-card border-0 shadow-elegant">
        {/* Image Container */}
        <div className="w-full h-80 md:h-[500px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -300 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <div className="h-full flex items-center justify-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative group w-full h-full cursor-pointer">
                      <Image
                        src={
                          typeof certificates[currentIndex].image === "string"
                            ? certificates[currentIndex].image
                            : certificates[currentIndex].image
                        }
                        alt={certificates[currentIndex].title}
                        width={800}
                        height={500}
                        className="w-full h-full object-fill rounded-lg shadow-card transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQRBQYSITFBUWH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAAIDAQAAAAAAAAAAAAAAAAECABEhMf/aAAwDAQACEQMRAD8AzPR9v39xrVrFd6Y9vbNKoluDNGxRCcFgFYk4HfVX+UpStYAGANOzP//Z"
                        sizes="(max-width: 768px) 100vw, 800px"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur-sm">
                    <div className="p-4">
                      <Image
                        src={
                          typeof certificates[currentIndex].image === "string"
                            ? certificates[currentIndex].image
                            : certificates[currentIndex].image
                        }
                        alt={certificates[currentIndex].title}
                        width={1200}
                        height={800}
                        className="w-full h-auto object-contain rounded-lg"
                        loading="lazy"
                        sizes="(max-width: 1200px) 100vw, 1200px"
                      />
                      <div className="mt-4 text-center">
                        <h4 className="text-lg font-semibold text-foreground">
                          {certificates[currentIndex].title}
                        </h4>
                        <p className="text-muted-foreground mt-2">
                          {certificates[currentIndex].description}
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
            disabled={certificates.length <= 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-background/80 hover:bg-background/90 backdrop-blur-sm"
            disabled={certificates.length <= 1}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Static Title & Description Below */}
        <div className="mt-6 px-6 text-center">
          <h4 className="text-lg font-semibold text-foreground mb-2">
            {certificates[currentIndex].title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {certificates[currentIndex].description}
          </p>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center space-x-2 p-4">
          {certificates.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "bg-primary scale-110"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
};

export default CertificateCarousel;
