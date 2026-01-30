import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard/banquet/schedule')
}
