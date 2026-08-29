"use client";

import { useEffect, useState } from "react";
import AdminPage from "@/components/admin/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CheckCircle2, AlertCircle, Edit2, Save, X, Truck, Building2 } from "lucide-react";
import { toast } from "sonner";

type TarifRow = {
  wilayaId: number;
  wilayaName: string | null;
  tarifLivraison: string;
  tarifStopdeskLivraison: string;
  tarifEchange: string;
  tarifStopdeskEchange: string;
  syncedAt: string | null;
};

export default function SettingsPage() {
  const [dhdSyncing, setDhdSyncing] = useState(false);
  const [yalidineSyncing, setYalidineSyncing] = useState(false);

  const [dhdResult, setDhdResult] = useState<any>(null);
  const [yalidineResult, setYalidineResult] = useState<any>(null);

  const [tarifs, setTarifs] = useState<TarifRow[]>([]);
  const [loadingTarifs, setLoadingTarifs] = useState(true);
  const [editingWilayaId, setEditingWilayaId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<TarifRow>>({});

  // Load DHD tarifs for the table
  const fetchTarifs = async () => {
    try {
      setLoadingTarifs(true);
      const res = await fetch("/api/settings/tarifs/dhd");
      if (res.ok) {
        const data = await res.json();
        setTarifs(data.tarifs || []);
      }
    } catch (err) {
      console.error("Error fetching tarifs:", err);
    } finally {
      setLoadingTarifs(false);
    }
  };

  useEffect(() => {
    fetchTarifs();
  }, []);

  // Sync DHD
  const handleSyncDhd = async () => {
    setDhdSyncing(true);
    setDhdResult(null);
    try {
      const res = await fetch("/api/settings/sync/dhd", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDhdResult(data);
        toast.success("DHD coverage synced successfully!");
        fetchTarifs();
      } else {
        toast.error(`DHD Sync failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("DHD sync error:", err);
      toast.error("Failed to connect to DHD sync endpoint.");
    } finally {
      setDhdSyncing(false);
    }
  };

  // Sync Yalidine
  const handleSyncYalidine = async () => {
    setYalidineSyncing(true);
    setYalidineResult(null);
    try {
      const res = await fetch("/api/settings/sync/yalidine", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setYalidineResult(data);
        toast.success("Yalidine coverage & centers synced successfully!");
      } else {
        toast.error(`Yalidine Sync failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Yalidine sync error:", err);
      toast.error("Failed to connect to Yalidine sync endpoint.");
    } finally {
      setYalidineSyncing(false);
    }
  };

  // Inline Tarif Edit
  const handleStartEdit = (row: TarifRow) => {
    setEditingWilayaId(row.wilayaId);
    setEditForm({
      tarifLivraison: row.tarifLivraison,
      tarifStopdeskLivraison: row.tarifStopdeskLivraison,
      tarifEchange: row.tarifEchange,
      tarifStopdeskEchange: row.tarifStopdeskEchange,
    });
  };

  const handleSaveEdit = async (wilayaId: number) => {
    try {
      const res = await fetch("/api/settings/tarifs/dhd", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wilayaId,
          ...editForm,
        }),
      });
      if (res.ok) {
        toast.success(`Tarifs updated for wilaya ${wilayaId}`);
        setEditingWilayaId(null);
        fetchTarifs();
      } else {
        const data = await res.json();
        toast.error(`Update failed: ${data.error}`);
      }
    } catch (err) {
      console.error("Tarif edit error:", err);
      toast.error("Failed to save tarif changes.");
    }
  };

  return (
    <AdminPage
      title="Delivery & Coverage Settings"
      description="Sync wilaya coverage, communes, and delivery fees live from DHD and Yalidine APIs."
    >
      {/* Provider Sync Cards */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DHD Card */}
        <Card className="border-blue-900/40 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Truck className="h-5 w-5 text-blue-500" />
                DHD Delivery (Ecotrack)
              </CardTitle>
              <CardDescription className="mt-1">
                Sync active wilayas, communes, and pricing directly from DHD API.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
              Live API
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {dhdResult && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-semibold text-blue-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Synced {new Date(dhdResult.syncedAt).toLocaleTimeString()}
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2 pt-1">
                  <div>Wilayas: {dhdResult.wilayas?.total}</div>
                  <div>Communes: {dhdResult.communes?.total}</div>
                  <div>Tarifs: {dhdResult.tarifs?.total}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Endpoints: /get/wilayas, /get/communes, /get/fees
              </span>
              <Button
                onClick={handleSyncDhd}
                disabled={dhdSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${dhdSyncing ? "animate-spin" : ""}`} />
                {dhdSyncing ? "Syncing DHD..." : "Sync DHD Data"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Yalidine Card */}
        <Card className="border-emerald-900/40 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Building2 className="h-5 w-5 text-emerald-500" />
                Yalidine Express
              </CardTitle>
              <CardDescription className="mt-1">
                Sync deliverable communes and stop-desk centers from Yalidine API.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              Live API
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {yalidineResult && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Synced {new Date(yalidineResult.syncedAt).toLocaleTimeString()}
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-3 gap-2 pt-1">
                  <div>Wilayas: {yalidineResult.wilayas?.total}</div>
                  <div>Communes: {yalidineResult.communes?.total}</div>
                  <div>Centers: {yalidineResult.centers?.mapped}</div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Endpoints: GET /v1/communes, GET /v1/centers
              </span>
              <Button
                onClick={handleSyncYalidine}
                disabled={yalidineSyncing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${yalidineSyncing ? "animate-spin" : ""}`} />
                {yalidineSyncing ? "Syncing Yalidine..." : "Sync Yalidine Data"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DHD Tarifs Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">DHD Tarifs Management</CardTitle>
            <CardDescription className="mt-1">
              View and manually override delivery and exchange fees per wilaya.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchTarifs} disabled={loadingTarifs}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingTarifs ? "animate-spin" : ""}`} />
            Refresh Table
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[80px]">Code</TableHead>
                  <TableHead>Wilaya</TableHead>
                  <TableHead>Livraison (Domicile)</TableHead>
                  <TableHead>Livraison (Stopdesk)</TableHead>
                  <TableHead>Échange (Domicile)</TableHead>
                  <TableHead>Échange (Stopdesk)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTarifs ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading tarifs...
                    </TableCell>
                  </TableRow>
                ) : tarifs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tarifs found. Click "Sync DHD Data" above to import live fees.
                    </TableCell>
                  </TableRow>
                ) : (
                  tarifs.map((row) => {
                    const isEditing = editingWilayaId === row.wilayaId;

                    return (
                      <TableRow key={row.wilayaId}>
                        <TableCell className="font-mono font-bold">{row.wilayaId}</TableCell>
                        <TableCell className="font-medium">
                          {row.wilayaName || `Wilaya ${row.wilayaId}`}
                        </TableCell>

                        {/* Livraison Domicile */}
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.tarifLivraison ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, tarifLivraison: e.target.value })
                              }
                              className="w-24 h-8"
                            />
                          ) : (
                            `${row.tarifLivraison} DA`
                          )}
                        </TableCell>

                        {/* Livraison Stopdesk */}
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.tarifStopdeskLivraison ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  tarifStopdeskLivraison: e.target.value,
                                })
                              }
                              className="w-24 h-8"
                            />
                          ) : (
                            `${row.tarifStopdeskLivraison} DA`
                          )}
                        </TableCell>

                        {/* Echange Domicile */}
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.tarifEchange ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, tarifEchange: e.target.value })
                              }
                              className="w-24 h-8"
                            />
                          ) : (
                            `${row.tarifEchange} DA`
                          )}
                        </TableCell>

                        {/* Echange Stopdesk */}
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editForm.tarifStopdeskEchange ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  tarifStopdeskEchange: e.target.value,
                                })
                              }
                              className="w-24 h-8"
                            />
                          ) : (
                            `${row.tarifStopdeskEchange} DA`
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-400"
                                onClick={() => handleSaveEdit(row.wilayaId)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground"
                                onClick={() => setEditingWilayaId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => handleStartEdit(row)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminPage>
  );
}
