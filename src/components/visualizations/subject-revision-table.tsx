"use client";

import * as React from "react";
import Link from "next/link";

import { formatDate } from "@/lib/date";

interface RevisionEntry {
  id: string;
  date: string;
}

export interface SubjectRevisionRow {
  topicId: string;
  title: string;
  retentionPercent: number;
  revisions: RevisionEntry[];
}

interface SubjectRevisionTableProps {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  rows: SubjectRevisionRow[];
  defaultOpen?: boolean;
}

const getRetentionColor = (value: number) => {
  if (value <= 40) return "#d62828";
  if (value <= 70) return "#f59e0b";
  return "#21ce99";
};

export function SubjectRevisionTable({
  subjectId,
  subjectName,
  subjectColor,
  rows,
  defaultOpen = true
}: SubjectRevisionTableProps) {
  return (
    <details className="subject-table-card" data-subject={subjectId} open={defaultOpen}>
      <summary className="subject-table-summary">
        <span className="subject-table-summary__marker" style={{ backgroundColor: subjectColor }} aria-hidden="true" />
        <span className="subject-table-summary__content">
          <span className="subject-table-summary__label">{subjectName}</span>
          <span className="subject-table-summary__meta">{rows.length} topic{rows.length === 1 ? "" : "s"}</span>
        </span>
      </summary>
      <div className="subject-table-wrapper">
        <table className="subject-table">
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col">Retention</th>
              <th scope="col">Revisions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="subject-table__empty">
                  No topics match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.topicId}>
                  <td>
                    <Link href={`/topics/${row.topicId}/edit`} className="subject-table__topic-link">
                      {row.title}
                    </Link>
                  </td>
                  <td>
                    <span
                      className="subject-table__retention"
                      style={{ color: getRetentionColor(row.retentionPercent) }}
                    >
                      {row.retentionPercent}%
                    </span>
                  </td>
                  <td>
                    {row.revisions.length > 0 ? (
                      <span className="subject-table__badges" role="list">
                        {row.revisions.map((revision, index) => (
                          <span
                            key={revision.id}
                            className="subject-table__badge"
                            title={`Revised on ${formatDate(revision.date)}`}
                            role="listitem"
                            aria-label={`Revision ${index + 1} on ${formatDate(revision.date)}`}
                          >
                            {index + 1}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="subject-table__empty">No revisions</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

