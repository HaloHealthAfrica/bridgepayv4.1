import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DollarSign, Plus, Settings, Shield } from "lucide-react";
import { projectAPI } from "../../services/api";
import { useAuthStore } from "../../store/auth.store";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Buttons";
import { ProjectStatusPill } from "../../components/projects/ProjectStatusPill";
import { ProgressBar } from "../../components/projects/ProgressBar";
import { MilestoneCard } from "../../components/projects/MilestoneCard";

function formatKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

export function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [evidence, setEvidence] = useState<any | null>(null);
  const [cardFundingTxn, setCardFundingTxn] = useState<string>(() =>
    id ? localStorage.getItem(`bridge_project_card_fund_${id}`) || "" : ""
  );
  const [checkingCard, setCheckingCard] = useState(false);
  const [cardFundingStatus, setCardFundingStatus] = useState<any | null>(null);

  const isOwner = project?.ownerId && user?.id ? project.ownerId === user.id : false;
  const canVerify = user?.role === "PROJECT_VERIFIER" || isOwner;

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await projectAPI.getProjectById(id);
        setProject(res.data.data.project);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const budget = Number(project?.budget || 0);
  const escrow = Number(project?.escrowBalance || 0);
  const progress = budget > 0 ? (escrow / budget) * 100 : 0;
  const remaining = Math.max(0, budget - escrow);

  const milestones = project?.milestones || [];
  const doneCount = useMemo(() => milestones.filter((m: any) => m.status === "APPROVED").length, [milestones]);

  if (loading) return <div>Loading...</div>;
  if (!project) return <div>Project not found.</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <button type="button" onClick={() => navigate("/projects")} className="text-primary font-semibold mb-4 hover:underline">
        ← Back to Projects
      </button>

      <div className="bg-surface rounded-card p-8 border border-gray-200 mb-6">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-extrabold">{project.title}</h1>
              <ProjectStatusPill status={project.status} />
            </div>
            <p className="text-text-secondary mb-4">{project.description}</p>
            <div className="flex flex-wrap gap-2">
              {project.category ? (
                <span className="bg-primary-light text-primary px-3 py-1 rounded-lg text-xs font-semibold">
                  {project.category}
                </span>
              ) : null}
              <span className="bg-primary-light text-primary px-3 py-1 rounded-lg text-xs font-semibold">
                Budget: {formatKES(budget)}
              </span>
            </div>
          </div>

          {isOwner ? (
            <div className="flex gap-2">
              <SecondaryButton icon={Settings} onClick={() => alert("Manage (next)")}>
                Manage
              </SecondaryButton>
              <PrimaryButton icon={Plus} onClick={() => alert("Add milestone (next)")}>
                Add Milestone
              </PrimaryButton>
            </div>
          ) : null}
        </div>

        <div className="bg-background rounded-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-text-secondary mb-1">Project Owner</div>
              <div className="font-semibold">{project.owner?.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Implementer</div>
              <div className="font-semibold">{project.implementer?.name || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Total Budget</div>
              <div className="font-semibold">{formatKES(budget)}</div>
            </div>
            <div>
              <div className="text-xs text-text-secondary mb-1">Escrow Balance</div>
              <div className="font-semibold text-primary">{formatKES(escrow)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Funding / escrow progress */}
      <div className="bg-surface rounded-card p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold">Escrow Progress</h2>
          <div className="text-sm font-semibold">
            {progress.toFixed(0)}% ({formatKES(escrow)} / {formatKES(budget)})
          </div>
        </div>
        <ProgressBar progress={progress} height={12} />

        {isOwner && project.status === "ASSIGNED" ? (
          <div className="mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-button p-4 mb-4 flex gap-3">
              <Shield className="text-blue-700" />
              <div>
                <div className="font-semibold text-blue-800">Secure Escrow</div>
                <div className="text-sm text-blue-800/80">
                  Funds will be locked in escrow and released when milestones are approved.
                </div>
              </div>
            </div>
            <PrimaryButton
              icon={DollarSign}
              onClick={async () => {
                try {
                  await projectAPI.fundProject(project.id);
                  alert("Project funded. Escrow locked.");
                  const res = await projectAPI.getProjectById(project.id);
                  setProject(res.data.data.project);
                } catch (e: any) {
                  alert(e?.response?.data?.error?.message || "Funding failed");
                }
              }}
            >
              Fund Project (from wallet)
            </PrimaryButton>
          </div>
        ) : null}

        {/* Diaspora/Card funding to project escrow */}
        {project.implementerId && ["ASSIGNED", "ACTIVE"].includes(project.status) && remaining > 0 ? (
          <div className="mt-4">
            <div className="bg-background border border-gray-200 rounded-button p-4 mb-3">
              <div className="font-semibold mb-1">Diaspora Funding (Card)</div>
              <div className="text-sm text-text-secondary">
                Fund this project via card. Funds are locked in escrow and tracked against the project.
              </div>
              <div className="text-xs text-text-secondary mt-2">Remaining to fund: {formatKES(remaining)}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <SecondaryButton
                onClick={async () => {
                  if (!id) return;
                  if (!cardFundingTxn) return alert("No pending card funding transaction found.");
                  setCheckingCard(true);
                  try {
                    const res = await projectAPI.checkProjectCardFundingStatus(cardFundingTxn);
                    setCardFundingStatus(res.data.data);
                    const tx = res.data.data.transaction;
                    if (tx?.status && tx.status !== "PENDING") {
                      localStorage.removeItem(`bridge_project_card_fund_${id}`);
                      setCardFundingTxn("");
                    }
                    const proj = await projectAPI.getProjectById(id);
                    setProject(proj.data.data.project);
                  } catch (e: any) {
                    alert(e?.response?.data?.error?.message || "Status check failed");
                  } finally {
                    setCheckingCard(false);
                  }
                }}
              >
                {checkingCard ? "Checking..." : "Check Card Status"}
              </SecondaryButton>

              <PrimaryButton
                icon={DollarSign}
                onClick={async () => {
                  if (!id) return;
                  const raw = prompt(`Enter amount to fund (max ${remaining} KES)`);
                  if (!raw) return;
                  const amt = Number(raw);
                  if (!Number.isFinite(amt) || amt < 1) return alert("Enter a valid amount");
                  if (amt > remaining) return alert(`Maximum funding is KES ${remaining}`);

                  try {
                    const res = await projectAPI.fundProjectCard(id, { amount: amt });
                    const providerTxn = res.data.data.providerTransactionId as string | undefined;
                    const url = res.data.data.checkoutUrl as string | undefined;
                    if (providerTxn) {
                      localStorage.setItem(`bridge_project_card_fund_${id}`, providerTxn);
                      setCardFundingTxn(providerTxn);
                    }
                    if (url) window.location.href = url;
                    else alert("No checkout URL returned.");
                  } catch (e: any) {
                    alert(e?.response?.data?.error?.message || "Card funding failed");
                  }
                }}
              >
                Fund via Card
              </PrimaryButton>
            </div>

            {cardFundingTxn ? (
              <div className="mt-3 text-xs text-text-secondary font-mono break-all">Provider Txn: {cardFundingTxn}</div>
            ) : null}
            {cardFundingStatus?.transaction ? (
              <div className="mt-2 text-xs text-text-secondary">
                Last status: <span className="font-semibold">{cardFundingStatus.transaction.status}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Milestones */}
      <div className="bg-surface rounded-card p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Milestones</h2>
          <div className="text-sm text-text-secondary">
            {doneCount} of {milestones.length} completed
          </div>
        </div>

        {milestones.map((m: any) => (
          <MilestoneCard
            key={m.id}
            milestone={m}
            showActions={canVerify}
            onApprove={async (milestone) => {
              const notes = prompt("Approval notes (optional)") || undefined;
              try {
                await projectAPI.approveMilestone(project.id, milestone.id, notes);
                const res = await projectAPI.getProjectById(project.id);
                setProject(res.data.data.project);
                alert("Milestone approved. Funds released from escrow.");
              } catch (e: any) {
                alert(e?.response?.data?.error?.message || "Approve failed");
              }
            }}
            onReject={async (milestone) => {
              const reason = prompt("Rejection reason (required)") || "";
              if (!reason) return;
              try {
                await projectAPI.rejectMilestone(project.id, milestone.id, reason);
                const res = await projectAPI.getProjectById(project.id);
                setProject(res.data.data.project);
                alert("Milestone rejected.");
              } catch (e: any) {
                alert(e?.response?.data?.error?.message || "Reject failed");
              }
            }}
            onViewEvidence={(milestone) => setEvidence(milestone.evidence)}
          />
        ))}
      </div>

      {/* Evidence viewer */}
      {evidence ? (
        <div
          onClick={() => setEvidence(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-surface rounded-card p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-lg">Evidence</div>
              <button className="text-primary font-semibold hover:underline" onClick={() => setEvidence(null)}>
                Close
              </button>
            </div>
            <pre className="bg-background p-4 rounded-button overflow-auto text-xs">
{JSON.stringify(evidence, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}




