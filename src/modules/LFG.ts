
export enum LFGActivity {
  'dsc'= "Deep Stone Crypt",
  'garden' = 'Garden of Salvation',
  'lw'='Last Wish'
}

export class LFG {
  private billboardChannelID = '787699897838993479'

  private entried: {
    [id: string]: {
      messageID: string,
      participants: string[]
      alternatives: string[],

      dueDate: number
      activity: LFGActivity
      desc?: string
    }
  } = {}
}