
import { ContributionTable } from '@/components/home/ContributionTable'
import { HighlightsSection } from '@/components/home/HighlightsSection'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})



function HomePage() {
  return (
    <div className='flex flex-col min-h-screen'>
      {/*Highlight Section*/}
      <HighlightsSection />
      {/*Repos List Section*/}
      <ContributionTable />
    </div>
  )
}
