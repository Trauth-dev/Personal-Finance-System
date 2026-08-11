/**
 * Configuración de monedas y países para el alcance internacional de la app.
 *
 * MODELO: "una moneda por usuario". Cada usuario elige su país al registrarse
 * y toda su cuenta queda en la moneda de ese país. No hay conversión ni tipos
 * de cambio: un paraguayo ve guaraníes, un estadounidense ve dólares, etc.
 *
 * La moneda se guarda en profiles.moneda y se expone en la app mediante una
 * variable de módulo (getCurrentCurrency/setCurrentCurrency) para que el helper
 * formatMoney funcione en cualquier lugar sin tener que pasar la moneda a mano
 * en los 400+ puntos donde se formatea dinero.
 */

export type CurrencyCode =
  | "PYG"
  | "UYU"
  | "ARS"
  | "BRL"
  | "CLP"
  | "USD"
  | "EUR"
  | "MXN"
  | "COP"
  | "PEN"
  | "BOB"
  | "VES"

export interface CurrencyConfig {
  code: CurrencyCode
  /** Símbolo que se antepone al monto (ej. "Gs", "$", "R$"). */
  symbol: string
  /** Locale para el formateo de miles/decimales (Intl). */
  locale: string
  /** Cantidad de decimales de la moneda (0 para guaraníes/pesos chilenos). */
  decimals: number
  /** Nombre legible de la moneda. */
  name: string
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PYG: { code: "PYG", symbol: "Gs", locale: "es-PY", decimals: 0, name: "Guaraní paraguayo" },
  UYU: { code: "UYU", symbol: "$U", locale: "es-UY", decimals: 2, name: "Peso uruguayo" },
  ARS: { code: "ARS", symbol: "$", locale: "es-AR", decimals: 2, name: "Peso argentino" },
  BRL: { code: "BRL", symbol: "R$", locale: "pt-BR", decimals: 2, name: "Real brasileño" },
  CLP: { code: "CLP", symbol: "$", locale: "es-CL", decimals: 0, name: "Peso chileno" },
  USD: { code: "USD", symbol: "$", locale: "en-US", decimals: 2, name: "Dólar estadounidense" },
  EUR: { code: "EUR", symbol: "€", locale: "es-ES", decimals: 2, name: "Euro" },
  MXN: { code: "MXN", symbol: "$", locale: "es-MX", decimals: 2, name: "Peso mexicano" },
  COP: { code: "COP", symbol: "$", locale: "es-CO", decimals: 0, name: "Peso colombiano" },
  PEN: { code: "PEN", symbol: "S/", locale: "es-PE", decimals: 2, name: "Sol peruano" },
  BOB: { code: "BOB", symbol: "Bs", locale: "es-BO", decimals: 2, name: "Boliviano" },
  VES: { code: "VES", symbol: "Bs", locale: "es-VE", decimals: 2, name: "Bolívar venezolano" },
}

export interface CountryConfig {
  /** Código ISO de 2 letras. */
  code: string
  name: string
  flag: string
  currency: CurrencyCode
  /** Código telefónico internacional (ej. "+595"). */
  dialCode: string
  /** Zona horaria IANA (para uso futuro en fechas). */
  timezone: string
  /** Largo esperado del número local (sin código de país), para validación. */
  phoneLength: number
}

export const COUNTRIES: CountryConfig[] = [
  { code: "PY", name: "Paraguay", flag: "🇵🇾", currency: "PYG", dialCode: "+595", timezone: "America/Asuncion", phoneLength: 9 },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", currency: "UYU", dialCode: "+598", timezone: "America/Montevideo", phoneLength: 8 },
  { code: "AR", name: "Argentina", flag: "🇦🇷", currency: "ARS", dialCode: "+54", timezone: "America/Argentina/Buenos_Aires", phoneLength: 10 },
  { code: "BR", name: "Brasil", flag: "🇧🇷", currency: "BRL", dialCode: "+55", timezone: "America/Sao_Paulo", phoneLength: 11 },
  { code: "CL", name: "Chile", flag: "🇨🇱", currency: "CLP", dialCode: "+56", timezone: "America/Santiago", phoneLength: 9 },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", currency: "BOB", dialCode: "+591", timezone: "America/La_Paz", phoneLength: 8 },
  { code: "PE", name: "Perú", flag: "🇵🇪", currency: "PEN", dialCode: "+51", timezone: "America/Lima", phoneLength: 9 },
  { code: "CO", name: "Colombia", flag: "🇨🇴", currency: "COP", dialCode: "+57", timezone: "America/Bogota", phoneLength: 10 },
  { code: "MX", name: "México", flag: "🇲🇽", currency: "MXN", dialCode: "+52", timezone: "America/Mexico_City", phoneLength: 10 },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", currency: "VES", dialCode: "+58", timezone: "America/Caracas", phoneLength: 10 },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", currency: "USD", dialCode: "+1", timezone: "America/New_York", phoneLength: 10 },
  { code: "ES", name: "España", flag: "🇪🇸", currency: "EUR", dialCode: "+34", timezone: "Europe/Madrid", phoneLength: 9 },
]

export const DEFAULT_COUNTRY_CODE = "PY"
export const DEFAULT_CURRENCY: CurrencyCode = "PYG"

export function getCountryByCode(code: string | null | undefined): CountryConfig {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]
}

export function getCurrencyConfig(code: string | null | undefined): CurrencyConfig {
  return CURRENCIES[(code as CurrencyCode) ?? DEFAULT_CURRENCY] ?? CURRENCIES[DEFAULT_CURRENCY]
}

/* -------------------------------------------------------------------------- */
/* Moneda actual del usuario (variable de módulo)                              */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "user_currency"

// Inicializa de forma síncrona desde localStorage para evitar un "flash" de la
// moneda por defecto en el primer render del cliente.
let _currentCurrency: CurrencyCode =
  (typeof window !== "undefined" && (localStorage.getItem(STORAGE_KEY) as CurrencyCode)) || DEFAULT_CURRENCY

/** Establece la moneda activa del usuario (persistida en localStorage). */
export function setCurrentCurrency(code: string | null | undefined) {
  const valid = (code as CurrencyCode) in CURRENCIES ? (code as CurrencyCode) : DEFAULT_CURRENCY
  _currentCurrency = valid
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, valid)
  }
}

/** Devuelve la moneda activa del usuario. */
export function getCurrentCurrency(): CurrencyCode {
  return _currentCurrency
}

/**
 * Formatea un monto en la moneda indicada (o la moneda activa del usuario).
 * Reemplaza a formatGuaranies como formateador central de dinero.
 */
export function formatMoney(amount: number | null | undefined, currency?: string): string {
  const cfg = getCurrencyConfig(currency ?? getCurrentCurrency())
  return `${cfg.symbol} ${formatMoneyNumber(amount, currency)}`
}

/**
 * Devuelve SOLO el número formateado (miles/decimales según la moneda), sin el
 * símbolo. Útil cuando el símbolo se muestra por separado en la UI. Reemplaza
 * al patrón frágil `formatGuaranies(x).replace("Gs ", "")`, que no funciona con
 * monedas cuyo símbolo no es "Gs".
 */
export function formatMoneyNumber(amount: number | null | undefined, currency?: string): string {
  const cfg = getCurrencyConfig(currency ?? getCurrentCurrency())
  const safeAmount = amount ?? 0
  return safeAmount.toLocaleString(cfg.locale, {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  })
}

/** Devuelve el símbolo de la moneda activa (o la indicada). */
export function getCurrencySymbol(currency?: string): string {
  return getCurrencyConfig(currency ?? getCurrentCurrency()).symbol
}
