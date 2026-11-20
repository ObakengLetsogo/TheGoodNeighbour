package za.co.thegoodneighbour.tgn.service;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.config.TgnProperties;
import za.co.thegoodneighbour.tgn.domain.BenefitItem;
import za.co.thegoodneighbour.tgn.domain.CoverConfig;
import za.co.thegoodneighbour.tgn.domain.CoverConfig.RelationshipRule;
import za.co.thegoodneighbour.tgn.repo.BenefitItemRepository;
import za.co.thegoodneighbour.tgn.domain.LegalDocument;
import za.co.thegoodneighbour.tgn.repo.CoverConfigRepository;
import za.co.thegoodneighbour.tgn.repo.LegalDocumentRepository;

/**
 * Seeds PLACEHOLDER rules and a sample catalogue so the apps can be used. Every number here (rates,
 * multipliers, ages, waiting periods, costs, values, herd size, grocery contents) must be replaced by
 * the underwriter's and your real figures in the admin dashboard. Disabled in production by default.
 */
@Component
public class SampleCoverSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(SampleCoverSeeder.class);
    private final TgnProperties props;
    private final CoverConfigRepository configs;
    private final BenefitItemRepository items;
    private final StaffAuthService staff;
    private final LegalDocumentRepository legal;

    public SampleCoverSeeder(TgnProperties props, CoverConfigRepository configs, BenefitItemRepository items, StaffAuthService staff, LegalDocumentRepository legal) {
        this.props = props; this.configs = configs; this.items = items; this.staff = staff; this.legal = legal;
    }

    private static long r(int rand) { return rand * 100L; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        staff.createIfNone(props.bootstrapAdminEmail(), props.bootstrapAdminPassword());
        seedLegalPlaceholders();
        if (!props.seedSampleCover() || configs.count() > 0) return;

        int rateBps = props.seedBaseRateBps() != null ? props.seedBaseRateBps() : 55;   // 0.55% of bundle cost a month, per person: a placeholder
        configs.save(new CoverConfig(rateBps, r(2_500), 180, 0, 180, 18, 65, 85, 10, 25, 2, 90, 1000, 31, List.of(
                new RelationshipRule("spouse", 10000, 18, 65, 85, 1),
                new RelationshipRule("child", 4000, 0, 21, 24, 6),
                new RelationshipRule("parent", 10000, 18, 75, 90, 2),
                new RelationshipRule("parent_in_law", 10000, 18, 75, 90, 2),
                new RelationshipRule("grandparent", 10000, 18, 75, 90, 2),
                new RelationshipRule("sibling", 10000, 18, 65, 85, 3),
                new RelationshipRule("other", 11000, 18, 65, 85, 3)),
                List.of(new CoverConfig.AgeBand(0, 17, 10000), new CoverConfig.AgeBand(18, 35, 10000), new CoverConfig.AgeBand(36, 45, 12000),
                        new CoverConfig.AgeBand(46, 55, 15000), new CoverConfig.AgeBand(56, 65, 20000), new CoverConfig.AgeBand(66, 75, 28000),
                        new CoverConfig.AgeBand(76, 120, 38000))));

        List<String> base = List.of("Maize meal 12.5 kg × 2", "Long-grain rice 10 kg", "Sunflower oil 5 L", "Cake flour 5 kg", "White sugar 5 kg", "Salt 1 kg", "Tea bags 100s", "Instant coffee 250 g");
        items.save(new BenefitItem("grocery-2500", "grocery", "Grocery Hamper R2 500", "The staples to feed the household through the first days.", "hamper", r(2_500), r(1_950), 1, "grocery", true, 0, null, base));
        items.save(new BenefitItem("grocery-5000", "grocery", "Grocery Hamper R5 000", "A fuller hamper for a household welcoming family.", "hamper", r(5_000), r(3_800), 1, "grocery", true, 1, null, List.of(
                "Maize meal 25 kg × 2", "Long-grain rice 20 kg", "Sunflower oil 5 L × 2", "Cake flour 10 kg", "White sugar 10 kg", "Salt 2 kg", "Samp 5 kg", "Sugar beans 5 kg",
                "Tinned pilchards × 12", "Potatoes 20 kg", "Onions 10 kg", "Tea bags 200s", "Instant coffee 750 g", "Spice selection")));
        items.save(new BenefitItem("grocery-7500", "grocery", "Grocery Hamper R7 500", "Generous quantities for gatherings that run over several days.", "hamper", r(7_500), r(5_700), 1, "grocery", true, 2, null, List.of(
                "Maize meal 25 kg × 3", "Long-grain rice 30 kg", "Sunflower oil 5 L × 3", "Cake flour 20 kg", "White sugar 15 kg", "Salt 3 kg", "Samp 10 kg", "Sugar beans 10 kg",
                "Tinned pilchards × 24", "Potatoes 40 kg", "Onions 20 kg", "Butternut and cabbage", "Tea bags 400s", "Instant coffee 1 kg", "Spice selection", "Still water 5 L × 8")));
        items.save(new BenefitItem("grocery-10000", "grocery", "Grocery Hamper R10 000", "Our largest hamper, for a full homestead.", "hamper", r(10_000), r(7_500), 1, "grocery", true, 3, null, List.of(
                "Maize meal 25 kg × 4", "Long-grain rice 40 kg", "Sunflower oil 5 L × 4", "Cake flour 25 kg", "White sugar 20 kg", "Salt 4 kg", "Samp 10 kg", "Sugar beans 15 kg",
                "Tinned pilchards × 36", "Potatoes 60 kg", "Onions 30 kg", "Butternut, cabbage and carrots", "Tea bags 600s", "Instant coffee 1.5 kg", "Spice selection",
                "Still water 5 L × 12", "Disposable plates, cups and cutlery for 100")));
        items.save(new BenefitItem("sheep", "livestock", "Sheep", "Healthy sheep from our own farm. Choose one, two or three.", "sheep", r(3_200), r(1_500), 3, null, true, 4, 120, List.of()));
        items.save(new BenefitItem("cattle", "livestock", "Cow", "A cow from our own farm.", "cow", r(14_500), r(7_000), 2, null, true, 5, 30, List.of()));
        log.warn("Seeded SAMPLE cover rules and catalogue (placeholder numbers). Not for production use.");
    }

    /**
     * DRAFT legal text so the apps have something to show and consent can be recorded. It is marked as a
     * draft to customers and is NOT legal advice or approved wording. Replace it in the admin dashboard with text
     * approved by your lawyer and underwriter, then untick "draft".
     */
    private void seedLegalPlaceholders() {
        if (legal.findById("terms").isEmpty()) legal.save(new LegalDocument("terms", "Terms Of Use", text("terms"), true));
        if (legal.findById("privacy").isEmpty()) legal.save(new LegalDocument("privacy", "Privacy Notice", text("privacy"), true));
    }

    /** The draft wording lives in src/main/resources/legal/ so a lawyer can read and mark it up as plain files. */
    private static String text(String name) {
        try (var in = SampleCoverSeeder.class.getResourceAsStream("/legal/" + name + ".md")) {
            return new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) { throw new IllegalStateException("Missing draft legal text: " + name, e); }
    }
}
