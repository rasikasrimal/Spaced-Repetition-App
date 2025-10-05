"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTopicStore } from "@/stores/topics";
import { useProfileStore } from "@/stores/profile";
import { useReviewPreferencesStore } from "@/stores/review-preferences";
import {
  TopicList,
  TopicListItem,
  TopicStatus,
  StatusFilter,
  SubjectFilterValue
} from "@/components/dashboard/topic-list";
import { useZonedNow } from "@/hooks/use-zoned-now";
import { computeRiskScore, getAverageQuality } from "@/lib/forgetting-curve";
import { startOfToday } from "@/lib/date";
import type { Subject } from "@/types/topic";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STATUS_STORAGE_KEY = "reviews-status-filter";

export default function ReviewsPage() {
  const router = useRouter();
  const { topics, subjects } = useTopicStore((state) => ({
    topics: state.topics,
    subjects: state.subjects
  }));
  const timezone = useProfileStore((state) => state.profile.timezone) || "Asia/Colombo";
  const reviewTrigger = useReviewPreferencesStore((state) => state.reviewTrigger);
  const triggerPercent = Math.round(reviewTrigger * 100);
  const zonedNow = useZonedNow(timezone);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("due-today");
  const [subjectFilter, setSubjectFilter] = React.useState<SubjectFilterValue>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(STATUS_STORAGE_KEY);
    if (!stored) return;
    if (stored === "all" || stored === "overdue" || stored === "due-today" || stored === "upcoming") {
      setStatusFilter(stored);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(STATUS_STORAGE_KEY, statusFilter);
  }, [statusFilter]);

  const enrichedTopics = React.useMemo<TopicListItem[]>(() => {
    const subjectMap = new Map<string, Subject>();
    for (const subject of subjects) {
      subjectMap.set(subject.id, subject);
    }

    const start = startOfToday().getTime();
    const endOfTodayMs = start + DAY_IN_MS;

    return topics.map((topic) => {
      const nextTime = new Date(topic.nextReviewDate).getTime();
      let status: TopicStatus;
      if (!Number.isFinite(nextTime) || Number.isNaN(nextTime)) {
        status = "upcoming";
      } else if (nextTime < start) {
        status = "overdue";
      } else if (nextTime < endOfTodayMs) {
        status = "due-today";
      } else {
        status = "upcoming";
      }

      const subject = topic.subjectId ? subjectMap.get(topic.subjectId) ?? null : null;

      return {
        topic,
        subject,
        status,
        risk: computeRiskScore({
          now: zonedNow,
          stabilityDays: topic.stability,
          targetRetrievability: topic.retrievabilityTarget,
          lastReviewedAt: topic.lastReviewedAt,
          nextReviewAt: topic.nextReviewDate,
          reviewsCount: topic.reviewsCount,
          averageQuality: getAverageQuality(
            (topic.events ?? [])
              .filter((event) => event.type === "reviewed" && typeof event.reviewQuality === "number")
              .map((event) => event.reviewQuality as number)
          ),
          examDate: subject?.examDate ?? null,
          difficultyModifier: subject?.difficultyModifier ?? topic.subjectDifficultyModifier ?? 1
        })
      } satisfies TopicListItem;
    });
  }, [topics, subjects, zonedNow]);

  const actionableCount = React.useMemo(
    () => enrichedTopics.filter((item) => item.status !== "upcoming").length,
    [enrichedTopics]
  );

  const handleEditTopic = React.useCallback(
    (id: string) => {
      router.push(`/topics/${id}/edit`);
    },
    [router]
  );

  const handleCreateTopic = React.useCallback(() => {
    router.push("/topics/new");
  }, [router]);

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Stay on pace by tackling the topics that are due now. We’ll cue up new reviews when your predicted retention dips below
          {" "}
          {triggerPercent}%.
        </p>
        <p className="text-xs text-muted-foreground">
          {actionableCount} topic{actionableCount === 1 ? "" : "s"} currently need attention.
        </p>
        <p className="text-xs text-muted-foreground">
          Upcoming cards surface automatically once retention is projected to slip below {triggerPercent}%.
        </p>
      </header>

      <TopicList
        id="reviews-topic-list"
        items={enrichedTopics}
        subjects={subjects}
        timezone={timezone}
        zonedNow={zonedNow}
        onEditTopic={handleEditTopic}
        onCreateTopic={handleCreateTopic}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        subjectFilter={subjectFilter}
        onSubjectFilterChange={setSubjectFilter}
      />
    </section>
  );
}
