import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { QrCode } from 'lucide-react';
import { Navigation } from '@/components/common/Navigation';
import { Button } from '@/components/common/Button';
import { walletAPI } from '@/services/api';
import { toast } from 'sonner';

export default function QRPayPage() {
  const navigate = useNavigate();
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQR = async () => {
    try {
      setLoading(true);
      // This would call the QR generation API
      // For now, we'll just show a placeholder
      setQrData('bridge://pay?amount=1000&currency=KES');
      toast.success('QR Code generated!');
    } catch (error: any) {
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    // This would download the QR code image
    toast.success('QR Code downloaded!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="px-6 py-6 max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/wallet')}
            className="text-primary text-base font-semibold mb-4 hover:underline"
          >
            ← Back to Wallet
          </button>
          <h1 className="text-3xl font-bold mb-2">QR Pay</h1>
          <p className="text-text-secondary">Quick payments with QR codes</p>
        </div>

        <div className="flex gap-4 mb-8">
          <div
            onClick={handleGenerateQR}
            className="flex-1 bg-surface rounded-card p-8 text-center border-2 border-[#E0E0E0] cursor-pointer hover:border-primary transition-colors"
          >
            <div className="bg-primary-light rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <QrCode size={40} className="text-primary" />
            </div>
            <div className="font-bold mb-1">Generate QR</div>
            <div className="text-sm text-text-secondary">Let others pay you</div>
          </div>

          <div
            onClick={() => {
              // This would open camera/scanner
              toast.info('QR Scanner coming soon!');
            }}
            className="flex-1 bg-surface rounded-card p-8 text-center border-2 border-[#E0E0E0] cursor-pointer hover:border-primary transition-colors"
          >
            <div className="bg-primary-light rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <QrCode size={40} className="text-primary" />
            </div>
            <div className="font-bold mb-1">Scan QR</div>
            <div className="text-sm text-text-secondary">Pay a merchant</div>
          </div>
        </div>

        {qrData && (
          <div className="bg-surface rounded-card p-12 text-center border border-dashed border-[#E0E0E0]">
            <div className="w-[200px] h-[200px] bg-primary-light rounded-card mx-auto mb-6 flex items-center justify-center">
              <QrCode size={120} className="text-primary" />
            </div>
            <div className="text-lg font-bold mb-2">Your Payment QR Code</div>
            <div className="text-sm text-text-secondary mb-6">
              Show this to receive payments
            </div>
            <Button variant="secondary" onClick={handleDownloadQR}>
              Download QR
            </Button>
          </div>
        )}

        {!qrData && (
          <div className="bg-surface rounded-card p-12 text-center border border-dashed border-[#E0E0E0]">
            <div className="w-[200px] h-[200px] bg-primary-light rounded-card mx-auto mb-6 flex items-center justify-center">
              <QrCode size={120} className="text-primary opacity-50" />
            </div>
            <div className="text-lg font-bold mb-2">Generate a QR Code</div>
            <div className="text-sm text-text-secondary mb-6">
              Click "Generate QR" above to create your payment QR code
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

