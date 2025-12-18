import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ROLES } from '@/utils/auth/roles';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

function KYCReviewContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    'Document is clear and readable': false,
    'Document appears authentic': false,
    'Name matches application': false,
    'ID number is valid': false,
    'Document is not expired': false,
    'Selfie matches ID photo': false,
    'No signs of tampering': false,
  });

  const toggleChecklist = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleApprove = () => {
    toast.success('KYC Approved! User can now access full features.');
    navigate('/kyc-verifier/dashboard');
  };

  const handleReject = () => {
    toast.error('KYC Rejected. User will be notified.');
    navigate('/kyc-verifier/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/kyc-verifier/dashboard')}
          className="text-primary text-base font-semibold mb-4 hover:underline"
        >
          ← Back to Queue
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Review KYC Submission</h1>
          <p className="text-text-secondary">James Ochieng • Individual Account</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Documents */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
              <h3 className="text-base font-bold mb-4">Submitted Documents</h3>

              <div className="bg-background rounded-xl p-4 mb-4">
                <div className="font-semibold mb-2">National ID Card</div>
                <div className="bg-primary-light rounded-lg h-[300px] flex items-center justify-center text-primary text-sm">
                  📄 ID Document Preview
                </div>
              </div>

              <div className="bg-background rounded-xl p-4">
                <div className="font-semibold mb-2">Selfie Verification</div>
                <div className="bg-primary-light rounded-lg h-[200px] flex items-center justify-center text-primary text-sm">
                  📸 Selfie Preview
                </div>
              </div>
            </div>
          </div>

          {/* Verification Checklist */}
          <div>
            <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-6">
              <h3 className="text-base font-bold mb-4">Verification Checklist</h3>

              {Object.keys(checklist).map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 p-3 bg-background rounded-lg mb-2 cursor-pointer hover:bg-primary-light transition-colors"
                  onClick={() => toggleChecklist(item)}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item]}
                    onChange={() => toggleChecklist(item)}
                    className="w-[18px] h-[18px] cursor-pointer"
                  />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>

            <div className="bg-surface rounded-card p-6 border border-[#E0E0E0] mb-4">
              <h3 className="text-base font-bold mb-3">Add Notes</h3>
              <textarea
                placeholder="Optional verification notes..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-3 text-sm border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:border-primary font-inherit resize-y"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button icon={ThumbsUp} fullWidth onClick={handleApprove}>
                Approve KYC
              </Button>
              <button
                onClick={handleReject}
                className="px-4 py-4 bg-error text-white border-none rounded-xl font-semibold cursor-pointer flex items-center justify-center gap-2 hover:bg-[#d32f2f] transition-colors"
              >
                <ThumbsDown size={20} />
                Reject Submission
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

