export type FruitPopOutcome = 'win' | 'lose'
export type FruitPopGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export interface FruitPopResultData {
  outcome: FruitPopOutcome
  reason: string
  score: number
  perfectPops: number
  totalFruits: number
  highScore: number
  isNewHighScore: boolean
  grade: FruitPopGrade
}
