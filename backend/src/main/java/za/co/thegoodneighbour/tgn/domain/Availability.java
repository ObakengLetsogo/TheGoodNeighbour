package za.co.thegoodneighbour.tgn.domain;

/** Wire values are shared with the mobile app's typed contracts. */
public final class Availability {
    public static final String IN_STOCK = "in_stock";
    public static final String LIMITED = "limited";
    public static final String ON_REQUEST = "on_request";
    public static final String OUT_OF_STOCK = "out_of_stock";

    private Availability() {}

    public static boolean purchasable(String availability) {
        return IN_STOCK.equals(availability) || LIMITED.equals(availability);
    }
}
