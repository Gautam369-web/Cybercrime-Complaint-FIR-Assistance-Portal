# Validation

The initial production build passed. Five unit tests passed: required fields, contact/amount/date validation, verbatim multilingual narrative, authenticated backup roundtrip/wrong-password rejection, malformed restore rejection.

Browser flow exercised consent gating, all ten questions, invalid URL rejection, evidence attachment, editable review, confirmation consent, local demo reference, theme switching, mobile layout, 2D fallback and arrow-key dock navigation. No runtime errors or horizontal mobile overflow were observed.

Initial axe checks found no violations on Home, Frost Home and mobile Home. Review exposed one invalid ARIA label on the decorative scene container; corrected with an explicit region role. Direct navigation to Review was also tightened to require consent before fields become available.

Scene checks observed all six building hover and click targets, camera transitions, owl/fox/firefly motion and frozen creature transforms with reduced motion. Foreground desktop measurement was about 60 fps on the test machine; this is not a low-end device guarantee. Mobile inactive scene labels were reduced to 44px controls to avoid crowding.

Screenshots and the latest automated results are in docs/qa. Automated checks do not replace screen-reader, native speaker, low-end device or legal review. PDF export relies on the browser’s print implementation; voice permissions and actual speech services were not exercised.
