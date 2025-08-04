"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

interface Ad {
  id: string
  name: string
  image_url: string
  link: string
  cnt_clk: number
}

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([])
  const [currentAdIndex, setCurrentAdIndex] = useState(0)

  useEffect(() => {
    fetchAds()
  }, [])

  useEffect(() => {
    if (ads.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length)
      }, 5000) // 5 soniyada bir o'zgaradi

      return () => clearInterval(interval)
    }
  }, [ads.length])

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase.from("ads").select("*").eq("is_active", true).order("sort_order")

      if (error) throw error
      setAds(data || [])
    } catch (error) {
      console.error("Reklamalarni yuklashda xatolik:", error)
    }
  }

  const handleAdClick = async (ad: Ad) => {
    try {
      // Bosishlar sonini oshirish
      await supabase
        .from("ads")
        .update({ cnt_clk: ad.cnt_clk + 1 })
        .eq("id", ad.id)

      // Linkga o'tish
      if (ad.link) {
        if (ad.link.startsWith("http")) {
          window.open(ad.link, "_blank")
        } else {
          window.location.href = ad.link
        }
      }
    } catch (error) {
      console.error("Reklama bosilishini qayd etishda xatolik:", error)
    }
  }

  if (ads.length === 0) return null

  const currentAd = ads[currentAdIndex]

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-3">
        <div
          className="relative w-full h-20 bg-muted rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => handleAdClick(currentAd)}
        >
          <Image
            src={currentAd.image_url || "/placeholder.svg"}
            alt={currentAd.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <h3 className="text-white text-lg font-bold text-center px-4">{currentAd.name}</h3>
          </div>
        </div>

        {/* Dots indicator */}
        {ads.length > 1 && (
          <div className="flex justify-center space-x-2 mt-2">
            {ads.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentAdIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentAdIndex ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
