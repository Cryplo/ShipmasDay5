import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with canvas and audio
const Playground = dynamic(() => import('@/components/Playground'), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <Playground />
    </main>
  )
}
