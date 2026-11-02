import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Orbit — Không gian làm việc nhóm',
  description: 'Không gian làm việc cho nhóm: thành viên, phân quyền và dự án.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>
}
