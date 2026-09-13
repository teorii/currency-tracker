"""Currency knowledge that more than one module needs."""

# What a new database watches before anyone has chosen anything: the G10
# currencies plus the most traded emerging-market ones. Everything else the
# provider quotes is stored but stays off the watchlist until added.
DEFAULT_WATCHLIST = frozenset(
    {
        "EUR",
        "GBP",
        "JPY",
        "CHF",
        "CAD",
        "AUD",
        "NZD",
        "SEK",
        "NOK",
        "CNY",
        "INR",
        "MXN",
        "BRL",
        "SGD",
        "HKD",
        "KRW",
    }
)
