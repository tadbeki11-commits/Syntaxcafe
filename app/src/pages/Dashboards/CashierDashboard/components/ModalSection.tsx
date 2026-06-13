import React from 'react';
import ProcessPaymentModal from '../modals/ProcessPaymentModal';
import ConfirmCashPaymentModal from '../modals/ConfirmCashPaymentModal';
import CancelOrderModal from '../modals/CancelOrderModal';
import PaymentReportsModal from '../modals/PaymentReportsModal';
import OperatorProfileModal from '../modals/OperatorProfileModal';

interface ModalSectionProps {
  isOnline: boolean;
  user: any;
  // Process Payment Modal
  showProcessPaymentModal: boolean;
  setShowProcessPaymentModal: (show: boolean) => void;
  selectedOrder: any;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  onProcessPayment: () => void;
  // Confirm Cash Payment Modal
  showConfirmProcessPaymentModal: boolean;
  setShowConfirmProcessPaymentModal: (show: boolean) => void;
  confirmProcessPaymentOrder: any;
  isBlockingPaymentUi: boolean;
  isProcessing: boolean;
  onConfirmCashPayment: () => void;
  // Cancel Order Modal
  showProcessPaymentConfirmModal: boolean;
  setShowProcessPaymentConfirmModal: (show: boolean) => void;
  confirmOrder: any;
  confirmOrderProcessing: boolean;
  onConfirmCancelOrder: () => void;
  // Cancel password extra props
  requireCancelPassword: boolean;
  adminCancelHashedPassword: string | null;
  onCancelPasswordChange: (val: string) => void;
  // Reports Modal
  showReportsModal: boolean;
  setShowReportsModal: (show: boolean) => void;
  todayStats: any;
  // Profile Modal
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  profileData: any;
  setProfileData: (data: any) => void;
  onUpdateProfile: () => void;
  // Utilities
  formatCurrency: (val: any) => string;
}

export const ModalSection: React.FC<ModalSectionProps> = ({
  isOnline,
  user,
  showProcessPaymentModal,
  setShowProcessPaymentModal,
  selectedOrder,
  paymentMethod,
  setPaymentMethod,
  onProcessPayment,
  showConfirmProcessPaymentModal,
  setShowConfirmProcessPaymentModal,
  confirmProcessPaymentOrder,
  isBlockingPaymentUi,
  isProcessing,
  onConfirmCashPayment,
  showProcessPaymentConfirmModal,
  setShowProcessPaymentConfirmModal,
  confirmOrder,
  confirmOrderProcessing,
  onConfirmCancelOrder,
  requireCancelPassword,
  adminCancelHashedPassword,
  onCancelPasswordChange,
  showReportsModal,
  setShowReportsModal,
  todayStats,
  showProfileModal,
  setShowProfileModal,
  profileData,
  setProfileData,
  onUpdateProfile,
  formatCurrency
}) => {
  return (
    <>
      <ProcessPaymentModal
        open={showProcessPaymentModal}
        onOpenChange={setShowProcessPaymentModal}
        selectedOrder={selectedOrder}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onProcessPayment={onProcessPayment}
        formatCurrency={formatCurrency}
      />

      <ConfirmCashPaymentModal
        open={showConfirmProcessPaymentModal}
        onOpenChange={setShowConfirmProcessPaymentModal}
        confirmProcessPaymentOrder={confirmProcessPaymentOrder}
        isBlockingPaymentUi={isBlockingPaymentUi}
        isProcessing={isProcessing}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onConfirm={onConfirmCashPayment}
        formatCurrency={formatCurrency}
      />

      <CancelOrderModal
        open={showProcessPaymentConfirmModal}
        onOpenChange={setShowProcessPaymentConfirmModal}
        confirmOrder={confirmOrder}
        isProcessing={confirmOrderProcessing}
        onConfirm={onConfirmCancelOrder}
        formatCurrency={formatCurrency}
        requireCancelPassword={requireCancelPassword}
        currentAdminHashedPassword={adminCancelHashedPassword}
        onCancelPasswordChange={onCancelPasswordChange}
      />


      <PaymentReportsModal
        open={showReportsModal}
        onOpenChange={setShowReportsModal}
        todayStats={todayStats}
        formatCurrency={formatCurrency}
      />

      <OperatorProfileModal
        isOnline={isOnline}
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        user={user}
        profileData={profileData}
        setProfileData={setProfileData}
        onUpdateProfile={onUpdateProfile}
      />
    </>
  );
};
