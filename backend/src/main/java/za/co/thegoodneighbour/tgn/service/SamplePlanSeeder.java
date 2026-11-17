package za.co.thegoodneighbour.tgn.service;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import za.co.thegoodneighbour.tgn.config.TgnProperties;
import za.co.thegoodneighbour.tgn.domain.Plan;
import za.co.thegoodneighbour.tgn.domain.Plan.MemberRule;
import za.co.thegoodneighbour.tgn.repo.PlanRepository;

/**
 * Seeds SAMPLE plans so the apps can be exercised. Every number here (premiums, fees, cover, age
 * limits, waiting periods) is a PLACEHOLDER: real pricing must come from the underwriter. Disabled in
 * production by default; staff manage plans in the admin dashboard.
 */
@Component
public class SamplePlanSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(SamplePlanSeeder.class);
    private final TgnProperties props;
    private final PlanRepository plans;
    private final StaffAuthService staff;

    public SamplePlanSeeder(TgnProperties props, PlanRepository plans, StaffAuthService staff) {
        this.props = props; this.plans = plans; this.staff = staff;
    }

    private static long r(int rand) { return rand * 100L; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        staff.createIfNone(props.bootstrapAdminEmail(), props.bootstrapAdminPassword());
        if (!props.seedSamplePlans() || plans.count() > 0) return;
        plans.save(new Plan("essential", "Essential", "Cover for you, with the option to add family.", r(15_000), r(99), 6, 18, 65, "olive", true, 0, List.of(
                new MemberRule("spouse", r(60), r(15_000), 1, 18, 65), new MemberRule("child", r(25), r(7_500), 6, 0, 21),
                new MemberRule("parent", r(90), r(10_000), 2, 18, 75), new MemberRule("extended", r(110), r(10_000), 4, 18, 75))));
        plans.save(new Plan("family", "Family", "Fuller cover for the whole household.", r(30_000), r(179), 6, 18, 65, "ember", true, 1, List.of(
                new MemberRule("spouse", r(90), r(30_000), 1, 18, 65), new MemberRule("child", r(35), r(15_000), 6, 0, 21),
                new MemberRule("parent", r(120), r(20_000), 2, 18, 75), new MemberRule("extended", r(140), r(20_000), 4, 18, 75))));
        plans.save(new Plan("complete", "Complete", "Our highest cover, for everyone who matters.", r(50_000), r(299), 3, 18, 65, "berry", true, 2, List.of(
                new MemberRule("spouse", r(130), r(50_000), 1, 18, 65), new MemberRule("child", r(45), r(25_000), 6, 0, 21),
                new MemberRule("parent", r(160), r(30_000), 2, 18, 75), new MemberRule("extended", r(180), r(30_000), 4, 18, 75))));
        log.warn("Seeded SAMPLE plans (placeholder pricing). Not for production use.");
    }
}
