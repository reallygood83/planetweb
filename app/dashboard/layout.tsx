'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { Menu, X, ChevronDown } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">로딩 중...</div>
  }

  if (!user) {
    return null
  }

  interface NavItem {
    name: string
    href?: string
    items?: { name: string; href: string }[]
  }

  const navigation: NavItem[] = [
    { name: '대시보드', href: '/dashboard' },
    {
      name: '평가관리',
      items: [
        { name: '평가계획', href: '/dashboard/evaluation' },
        { name: '평가결과입력', href: '/dashboard/evaluation-results' },
        { name: '학급관리', href: '/dashboard/class' },
        { name: '학교코드', href: '/dashboard/school-code' },
      ]
    },
    {
      name: '설문조사',
      items: [
        { name: '설문생성', href: '/dashboard/generate' },
        { name: '설문관리', href: '/dashboard/surveys' },
        { name: '학생응답현황', href: '/dashboard/student-evaluation' },
      ]
    },
    {
      name: '생기부',
      items: [
        { name: '개별생성', href: '/dashboard/generate-record' },
        { name: '일괄생성', href: '/dashboard/generate-batch' },
        { name: '창의적체험활동', href: '/dashboard/creative-activities' },
        { name: '생기부관리', href: '/dashboard/records' },
      ]
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                  Planet
                </Link>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-6">
                {navigation.map((item) => (
                  <div key={item.name} className="relative">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                          pathname === item.href
                            ? 'border-blue-500 text-gray-900'
                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <div>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === item.name ? null : item.name)}
                          className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                            item.items?.some(subItem => pathname === subItem.href)
                              ? 'border-blue-500 text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }`}
                        >
                          {item.name}
                          <ChevronDown className="ml-1 h-4 w-4" />
                        </button>
                        {activeDropdown === item.name && item.items && (
                          <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                              {item.items.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={`block px-4 py-2 text-sm ${
                                    pathname === subItem.href
                                      ? 'bg-gray-100 text-gray-900'
                                      : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                                  onClick={() => setActiveDropdown(null)}
                                >
                                  {subItem.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden md:block text-sm text-gray-700">{user.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="hidden md:block">
                로그아웃
              </Button>
              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <div>
                    <div className="px-3 py-2 text-base font-medium text-gray-900">
                      {item.name}
                    </div>
                    {item.items?.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={`block pl-6 pr-3 py-2 text-base font-medium ${
                          pathname === subItem.href
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-3 py-2 text-sm text-gray-700">{user.email}</div>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}