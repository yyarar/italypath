"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import {
  getMentorChannel,
  type MentorChannelId,
} from "@/lib/mentor/channels";
import { safeSetItem } from "@/lib/safeStorage";

import ExpertLeadDesk from "@/components/mentor/expert/ExpertLeadDesk";
import MentorHub from "@/components/mentor/MentorHub";
import VolunteerDesk from "@/components/mentor/volunteer/VolunteerDesk";

// Hub tercih seridi (components/hub/PreferencesStrip.tsx) son masayi buradan okur.
const LAST_MENTOR_DESK_KEY = "italyPathLastMentorDesk";

const VIEW_TRANSITION = {
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as const,
};

function volunteerSignInHref() {
  return `/giris?redirect_url=${encodeURIComponent("/ai-mentor?desk=volunteer")}`;
}

export default function AIMentorPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [activeChannelId, setActiveChannelId] = useState<MentorChannelId | null>(
    null,
  );
  const hasAppliedDeskParamRef = useRef(false);
  const activeChannel = activeChannelId
    ? getMentorChannel(activeChannelId)
    : null;

  useEffect(() => {
    // ?desk= derin linki URL'den (dis kaynak) yalnizca bir kez okunur.
    const applyDeskParam = () => {
      if (hasAppliedDeskParamRef.current || typeof window === "undefined") {
        return;
      }

      const desk = new URLSearchParams(window.location.search).get("desk");
      if (desk === "volunteer" && !isLoaded) return;

      hasAppliedDeskParamRef.current = true;
      if (desk === "volunteer") {
        if (!isSignedIn) {
          router.push(volunteerSignInHref());
          return;
        }
        setActiveChannelId("volunteer");
        safeSetItem(LAST_MENTOR_DESK_KEY, "volunteer");
        return;
      }

      if (desk === "expert") {
        setActiveChannelId("expert");
        safeSetItem(LAST_MENTOR_DESK_KEY, "expert");
      }
    };
    applyDeskParam();
  }, [isLoaded, isSignedIn, router]);

  const handleSelectChannel = useCallback(
    (id: MentorChannelId) => {
      const channel = getMentorChannel(id);
      if (channel.experience === "volunteer-inbox" && !isLoaded) return;
      if (channel.experience === "volunteer-inbox" && !isSignedIn) {
        router.push(volunteerSignInHref());
        return;
      }
      if (channel.availability === "paused") return;
      setActiveChannelId(id);
      safeSetItem(LAST_MENTOR_DESK_KEY, id);
    },
    [isLoaded, isSignedIn, router],
  );

  const handleBackToHub = useCallback(() => {
    setActiveChannelId(null);
  }, []);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {activeChannel ? (
        <motion.div
          key={`desk-${activeChannel.id}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={VIEW_TRANSITION}
        >
          {activeChannel.experience === "volunteer-inbox" ? (
            <VolunteerDesk channel={activeChannel} onBackToHub={handleBackToHub} />
          ) : activeChannel.experience === "expert-lead" ? (
            <ExpertLeadDesk channel={activeChannel} onBackToHub={handleBackToHub} />
          ) : null}
        </motion.div>
      ) : (
        <motion.div
          key="hub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={VIEW_TRANSITION}
        >
          <MentorHub onSelectChannel={handleSelectChannel} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
