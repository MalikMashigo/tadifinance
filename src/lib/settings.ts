const BANKING_KEY = 'tadi_banking_details'

export interface BankingDetails {
  bankName: string
  accountName: string
  accountNumber: string
  branchCode: string
}

const DEFAULTS: BankingDetails = {
  bankName: 'Standard Bank',
  accountName: 'Tadiwanashe Karen Kaparipari',
  accountNumber: '025024396',
  branchCode: '1842',
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
