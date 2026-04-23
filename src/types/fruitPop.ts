export type FruitPopOutcome = 'win' | 'lose'
export type FruitPopGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export interface FruitPopRunData {
  level: number
}

export interface FruitPopResultData {
  level: number
  nextLevel: number
  outcome: FruitPopOutcome
  reason: string
  score: number
  perfectPops: number
  totalFruits: number
  highScore: number
  isNewHighScore: boolean
  grade: FruitPopGrade
}
