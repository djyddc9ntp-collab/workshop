package com.marlowefinch.ops;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * The stand-up line for a date range: the four KPIs plus the worst carrier and the busiest
 * ticket category. {@code onTimeRate} and both names are null when nothing qualifies in the range.
 */
public record Summary(
        LocalDate from,
        LocalDate to,
        Double onTimeRate,
        long openTickets,
        BigDecimal revenue,
        long orders,
        String worstCarrier,
        String busiestTicketCategory) {
}
