import type { CourtRiseApi } from '../shared/api'

declare global {
  interface Window {
    courtRise: CourtRiseApi
  }
}
export {}
