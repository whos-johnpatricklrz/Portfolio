/**
 * Rail icons - Slab Duo glyphs (see components/slab), wrapped in the `.ricon`
 * class so rail.css can lift the whole mark on hover. The earlier Its Hover
 * per-part choreography does not apply to filled two-tone glyphs; the rail
 * keeps its row slide and the icon gets a single lift + tilt instead.
 */
import { House, FolderOpen, Stack, Coffee, Star, User, ChatCircle, type Icon } from '@/components/slab'

type IconProps = { size?: number }

function wrap(Glyph: Icon) {
  return function RailIcon({ size = 18 }: IconProps) {
    return (
      <span className="ricon ricon--slab" aria-hidden="true">
        <Glyph size={size} className="ricon__whole" />
      </span>
    )
  }
}

export const HomeIcon = wrap(House)
export const FolderIcon = wrap(FolderOpen)
export const StackIcon = wrap(Stack)
export const CupIcon = wrap(Coffee)
export const StarIcon = wrap(Star)
export const UserIcon = wrap(User)
export const MessageIcon = wrap(ChatCircle)
