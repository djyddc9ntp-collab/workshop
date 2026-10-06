package com.marlowefinch.ops;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SummaryController {

    private final DashboardRepository repository;
    private final Clock clock;

    public SummaryController(DashboardRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @GetMapping("/api/summary")
    public Summary summary(@RequestParam(required = false) String from,
                           @RequestParam(required = false) String to) {
        DateRange range = DateRange.resolve(from, to, clock);
        Kpis kpis = repository.kpis(range);
        return new Summary(kpis.from(), kpis.to(), kpis.onTimeRate(), kpis.openTickets(),
                kpis.revenue(), kpis.orders(),
                worstCarrier(repository.onTimeByCarrier(range)),
                busiestCategory(repository.ticketsByCategory(range)));
    }

    /**
     * The carrier with the lowest on-time rate among carriers that delivered something.
     * Ties on rate are broken by carrier name, alphabetically. Null when no carrier delivered.
     */
    static String worstCarrier(List<CarrierOnTime> carriers) {
        return carriers.stream()
                .filter(c -> c.delivered() > 0 && c.rate() != null)
                .min(Comparator.comparing(CarrierOnTime::rate).thenComparing(CarrierOnTime::carrier))
                .map(CarrierOnTime::carrier)
                .orElse(null);
    }

    /**
     * The category with the most tickets opened in the range (by {@code total}, not open count).
     * Ties on total are broken by category name, alphabetically. Null when no tickets were opened.
     */
    static String busiestCategory(List<TicketCategoryCount> categories) {
        return categories.stream()
                .filter(c -> c.total() > 0)
                .min(Comparator.comparingLong(TicketCategoryCount::total).reversed()
                        .thenComparing(TicketCategoryCount::category))
                .map(TicketCategoryCount::category)
                .orElse(null);
    }
}
