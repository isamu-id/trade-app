"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Question = {
  id: string;
  question: string;
  answer: string | null;
  asker_id: string;
  created_at: string;
};

export default function QandA({
  itemId,
  isOwner,
  initialQuestions,
}: {
  itemId: string;
  isOwner: boolean;
  initialQuestions: Question[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [formOpen, setFormOpen] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submitQuestion() {
    if (!questionText.trim()) return;
    setLoading(true);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/");
      return;
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        item_id: itemId,
        asker_id: auth.user.id,
        question: questionText.trim(),
      })
      .select()
      .single();

    setLoading(false);
    if (!error && data) {
      setQuestions((prev) => [...prev, data as Question]);
      setQuestionText("");
      setFormOpen(false);
    }
  }

  async function submitAnswer(questionId: string) {
    const answer = answerTexts[questionId];
    if (!answer?.trim()) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("questions")
      .update({
        answer: answer.trim(),
        answered_at: new Date().toISOString(),
      })
      .eq("id", questionId)
      .select()
      .single();

    setLoading(false);
    if (!error && data) {
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? (data as Question) : q))
      );
      setAnswerTexts((prev) => ({ ...prev, [questionId]: "" }));
      setAnsweringId(null);
    }
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <p className="mb-3 text-sm font-medium">商品への質問</p>

      {/* Q&A一覧 */}
      <div className="flex flex-col gap-3 mb-4">
        {questions.length === 0 && (
          <p className="text-xs text-gray-400">まだ質問はありません。</p>
        )}
        {questions.map((q) => (
          <div key={q.id} className="rounded-lg bg-gray-50 p-3">
            <div className="flex gap-2 mb-2">
              <span className="text-xs font-bold text-blue-600 flex-shrink-0">Q</span>
              <p className="text-xs text-gray-800">{q.question}</p>
            </div>

            {q.answer ? (
              <div className="flex gap-2 pl-1 border-l-2 border-blue-400">
                <span className="text-xs font-bold text-blue-600 flex-shrink-0">A</span>
                <p className="text-xs text-gray-800">{q.answer}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2 pl-1 border-l-2 border-gray-200 opacity-50">
                  <span className="text-xs font-bold text-gray-400 flex-shrink-0">A</span>
                  <p className="text-xs text-gray-400">回答待ち...</p>
                </div>
                {isOwner && (
                  <div className="mt-2">
                    {answeringId === q.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={answerTexts[q.id] ?? ""}
                          onChange={(e) =>
                            setAnswerTexts((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          placeholder="回答を入力"
                          className="w-full h-16 rounded-lg border border-gray-300 px-2 py-1.5 text-xs resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setAnsweringId(null)}
                            className="text-xs px-3 py-1 rounded-lg border border-gray-300"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={() => submitAnswer(q.id)}
                            disabled={loading}
                            className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                          >
                            回答する
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAnsweringId(q.id)}
                        className="text-xs text-blue-600 underline"
                      >
                        回答する
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* 質問フォーム */}
      {!isOwner && (
        <>
          {formOpen ? (
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium mb-2">質問を入力</p>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="この商品について質問を入力してください"
                className="w-full h-16 rounded-lg border border-gray-300 px-2 py-1.5 text-xs resize-none"
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  onClick={() => {
                    setFormOpen(false);
                    setQuestionText("");
                  }}
                  className="text-xs px-3 py-1 rounded-lg border border-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={submitQuestion}
                  disabled={loading || !questionText.trim()}
                  className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white disabled:opacity-50"
                >
                  質問を送る
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setFormOpen(true)}
              className="w-full rounded-lg border border-gray-300 py-2 text-xs text-gray-700 hover:bg-gray-50"
            >
              質問する
            </button>
          )}
        </>
      )}
    </div>
  );
}
