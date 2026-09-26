"use client";

// Yönetim › Bildirimler: oturumdaki yöneticinin kutusu (yeni acente
// başvurusu gibi). Okundu/okunmadı işareti ve hepsini okundu yapma.

import * as React from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Nesne, type NesneAdi } from "@/components/lb/nesne";
import { getir, gonder, neZaman, simdiAl, useBildiri } from "./ortak";
import s from "./yonetim.module.css";

interface Bildirim { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string }
interface Yanit { notifications: Bildirim[]; unreadCount: number; pagination: { page: number; totalPages: number } }

const NESNE: Record<string, NesneAdi> = { AGENCY_APPLICATION: "anahtar-karti", AGENCY_APPROVED: "anahtar-karti", RESERVATION_FAILED: "iptal" };
const BAG: Record<string, string> = { AGENCY_APPLICATION: "/admin/agencies" };

export function Bildirimler() {
  const [simdi] = React.useState(simdiAl);
  const istemci = useQueryClient();
  const bildiri = useBildiri();
  const q = useInfiniteQuery({
    queryKey: ["yonetim", "bildirimler"],
    queryFn: ({ pageParam }) => getir<Yanit>(`/api/admin/notifications?kutu=ben&limit=30&page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (son) => (son.pagination.page < son.pagination.totalPages ? son.pagination.page + 1 : undefined),
  });
  const yenile = () => istemci.invalidateQueries({ queryKey: ["yonetim"] });
  const isaretle = useMutation({
    mutationFn: ({ id, okundu }: { id: string; okundu: boolean }) => gonder(`/api/admin/notifications/${id}`, "PATCH", { isRead: okundu }),
    onSuccess: yenile,
    onError: (e: Error) => bildiri(e.message),
  });
  const hepsi = useMutation({
    mutationFn: () => gonder("/api/admin/notifications", "PATCH", { markAllRead: true }),
    onSuccess: () => {
      yenile();
      bildiri("Hepsi okundu");
    },
    onError: (e: Error) => bildiri(e.message),
  });
  const liste = q.data?.pages.flatMap((p) => p.notifications) ?? [];
  const okunmamis = q.data?.pages[0]?.unreadCount ?? 0;

  return (
    <div className={s.dis}>
      <div className={s.sayfaBas}>
        <h1 className="lb-y">Bildirimler</h1>
        <button type="button" className={`${s.dugme} ${s.cerceve}`} disabled={!okunmamis || hepsi.isPending} onClick={() => hepsi.mutate()}>
          Tümünü okundu yap
        </button>
      </div>
      {q.isPending ? (
        <div className={s.iskelet} aria-busy="true" />
      ) : q.isError ? (
        <div className={s.bos}><b>Bildirimler alınamadı</b><button type="button" className={`${s.dugme} ${s.siyah}`} onClick={() => q.refetch()}>Tekrar dene</button></div>
      ) : liste.length ? (
        <div className={s.bildirimler}>
          {liste.map((b) => (
            <div key={b.id} className={s.bildirim} data-okunmadi={!b.isRead || undefined}>
              <Nesne ad={NESNE[b.type] ?? "zil"} boyut={40} />
              <div>
                <b>{BAG[b.type] ? <Link href={BAG[b.type]} style={{ color: "inherit" }}>{b.title}</Link> : b.title}</b>
                <span>{b.message}</span>
                <small>{neZaman(b.createdAt, simdi)}</small>
              </div>
              <button type="button" className={s.metinDugme} onClick={() => isaretle.mutate({ id: b.id, okundu: !b.isRead })}>
                {b.isRead ? "Okunmadı yap" : "Okundu yap"}
              </button>
            </div>
          ))}
          {q.hasNextPage && (
            <div className={s.dahaFazla}>
              <button type="button" className={`${s.dugme} ${s.cerceve}`} disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>Daha fazla göster</button>
            </div>
          )}
        </div>
      ) : (
        <div className={s.bos}>
          <Nesne ad="zil" boyut={72} />
          <b>Bildirim yok</b>
          <span>Yeni acente başvurusu gibi işler burada görünür.</span>
        </div>
      )}
    </div>
  );
}
