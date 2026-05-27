const BANKING_KEY = 'tadi_banking_details'

export interface BankingDetails {
  bankName: string
  accountName: string
  accountNumber: string
  branchCode: string
}

const DEFAULTS: BankingDetails = {
  bankName: '',
  accountName: 'TADI wa NASHE',
  accountNumber: '',
  branchCode: '',
}

export function getBankingDetails(): BankingDetails {
  try {
    const raw = localStorage.getItem(BANKING_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveBankingDetails(details: BankingDetails): void {
  localStorage.setItem(BANKING_KEY, JSON.stringify(details))
}
