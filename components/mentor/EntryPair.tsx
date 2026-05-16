"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

import { useLanguage } from "@/context/LanguageContext";

export default function EntryPair({
  questionNumber,
  question,
  responseText,
  isStreamingResponse,
}: {
  questionNumber: number;
  question: string;
  responseText: string;
  isStreamingResponse: boolean;
}) {
  const { t } = useLanguage();
  const numberLabel = String(questionNumber).padStart(2, "0");
  const questionId = `mentor-question-${numberLabel}`;
  const hasContent = responseText.length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      aria-labelledby={questionId}
      className="mt-10 first:mt-0"
    >
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--editorial-terracotta)]">
          {t.aiMentor.questionLabel} {numberLabel}
        </div>
        <p
          id={questionId}
          className="mt-1 max-w-2xl text-base font-semibold leading-snug tracking-[-0.003em] text-[var(--editorial-ink)] sm:text-lg"
        >
          {question}
        </p>
      </div>

      <div className="mt-4 border-t border-[var(--editorial-border)] pt-4">
        {hasContent ? (
          <div className="prose-chat max-w-2xl font-serif text-base leading-relaxed text-[var(--editorial-ink)] sm:text-lg">
            <ReactMarkdown>{responseText}</ReactMarkdown>
            {isStreamingResponse ? (
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-[1em] w-[7px] animate-pulse-cursor bg-[var(--editorial-ink)] align-text-bottom"
              />
            ) : null}
          </div>
        ) : isStreamingResponse ? (
          <span
            aria-hidden="true"
            className="inline-block h-[1em] w-[7px] animate-pulse-cursor bg-[var(--editorial-ink)] align-text-bottom"
          />
        ) : null}
      </div>
    </motion.article>
  );
}
