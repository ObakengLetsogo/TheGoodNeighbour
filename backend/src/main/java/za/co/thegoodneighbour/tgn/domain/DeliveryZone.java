package za.co.thegoodneighbour.tgn.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "delivery_zones")
public class DeliveryZone {
    @Id private String provinceCode;
    private String province;
    private long feeCents;
    private String note;

    protected DeliveryZone() {}

    public DeliveryZone(String provinceCode, String province, long feeCents, String note) {
        this.provinceCode = provinceCode; this.province = province; this.feeCents = feeCents; this.note = note;
    }

    public String getProvinceCode() { return provinceCode; }
    public String getProvince() { return province; }
    public long getFeeCents() { return feeCents; }
    public String getNote() { return note; }
}
