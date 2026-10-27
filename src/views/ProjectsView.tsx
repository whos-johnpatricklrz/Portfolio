import ProjectsGrid from '@/components/ProjectsGrid'

/**
 * Projects is a fixed viewport like Home: six cards, one per body of work,
 * each opening the real section in a dialog. No ViewShell - there is no
 * scrolling stack here and the reveal hooks would have nothing to reveal.
 */
export default function ProjectsView() {
  return <ProjectsGrid />
}
