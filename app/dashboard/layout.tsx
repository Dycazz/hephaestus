import { OrgProvider } from '@/context/OrgContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>
}
