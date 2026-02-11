import { ToastContainer } from '@/components/ui/Toast'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ToastContainer />
      {children}
    </div>
  )
}
