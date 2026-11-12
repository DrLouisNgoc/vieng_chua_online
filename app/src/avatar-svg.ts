import type { Gender } from "./onboarding";

// Parametric monk/nun avatar illustration. The shapes and the
// gender/color parametrization approach (a `data-look` attribute to
// swap gendered groups, a CSS custom property to recolor the robe) are
// reimplemented from chuasen.com's own onboarding avatar, reverse
// engineered from its public JS bundle on 2026-11-03 for this personal,
// never-published project — see docs/memory/decisions/0007. Class names
// are our own (`va-*`), not chuasen's (`fg-*`/`onb__*`).
const AVATAR_SVG_TEMPLATE = `
<svg class="va-figure" data-look="{{GENDER}}" viewBox="0 0 140 170" focusable="false" aria-hidden="true">
  <ellipse class="va-ring" cx="70" cy="159" rx="54" ry="8.5"/>
  <ellipse class="va-ground" cx="70" cy="159.5" rx="36" ry="5.5"/>
  <g class="va-nu">
    <circle class="va-hair" cx="97" cy="83" r="9.5"/>
    <path class="va-hair-line" d="M92 80q5-4 10 0"/>
    <circle class="va-tie" cx="91.5" cy="79" r="2.3"/>
  </g>
  <g class="va-body">
    <path class="va-pants" d="M55 128L47.5 154Q57 159 67 155L69.5 128Z"/>
    <path class="va-pants" d="M85 128L92.5 154Q83 159 73 155L70.5 128Z"/>
    <ellipse class="va-shoe" cx="56" cy="156.5" rx="10.5" ry="4.2"/>
    <ellipse class="va-shoe" cx="84" cy="156.5" rx="10.5" ry="4.2"/>
    <path class="va-robe" d="M51 87C58 82 82 82 89 87L98 136C83 142.5 57 142.5 42 136Z"/>
    <path class="va-fold" d="M60 118L56.5 138M80 118L83.5 138"/>
    <path class="va-hem" d="M42.5 135.5C57 142 83 142 97.5 135.5"/>
    <path class="va-skin-dark" d="M60 83L71 104L80 83Z"/>
    <path class="va-yem" d="M61 84.5h18l-2.5 17h-13z"/>
    <path class="va-trim" d="M82.5 84.5L70.5 105"/>
    <path class="va-lapel" d="M55.5 86.5L62.5 83.5L81 112.5L72.5 118Z"/>
    <path class="va-trim" d="M62.5 84L80.5 112"/>
    <rect class="va-collar" x="61.5" y="78.5" width="17" height="7" rx="3"/>
    <path class="va-closure" d="M75 86q7 2 12 7"/>
    <g class="va-buttons"><circle cx="70" cy="89" r="1.7"/><circle cx="70" cy="96" r="1.7"/></g>
    <path class="va-sleeve" d="M52 88C41 93 35.5 108 39.5 121C46 126.5 58 123 65.5 113C62.5 105 60.5 96 58.5 89Z"/>
    <path class="va-sleeve" d="M88 88C99 93 104.5 108 100.5 121C94 126.5 82 123 74.5 113C77.5 105 79.5 96 81.5 89Z"/>
    <path class="va-trim" d="M39.5 121C46 126.5 58 123 65.5 113M100.5 121C94 126.5 82 123 74.5 113"/>
    <path class="va-skin" d="M70 101.5C75.5 106.5 76.5 115 70 122C63.5 115 64.5 106.5 70 101.5Z"/>
    <path class="va-line" d="M70 104.5V119"/>
  </g>
  <g class="va-head">
    <g class="va-nam">
      <circle class="va-skin" cx="38.5" cy="56" r="5.8"/>
      <circle class="va-skin" cx="101.5" cy="56" r="5.8"/>
      <circle class="va-skin-dark" cx="38.5" cy="56" r="2.6"/>
      <circle class="va-skin-dark" cx="101.5" cy="56" r="2.6"/>
    </g>
    <ellipse class="va-skin" cx="70" cy="52" rx="32" ry="30"/>
    <path class="va-skin-dark" d="M41.7 66A32 30 0 0 0 98.3 66Q70 88 41.7 66Z"/>
    <g class="va-nam">
      <path class="va-scalp" d="M38 52A32 30 0 0 1 102 52C98 40 86 33 70 33C54 33 42 40 38 52Z"/>
      <path class="va-stubble" d="M38 52A32 30 0 0 1 102 52C98 40 86 33 70 33C54 33 42 40 38 52Z"/>
    </g>
    <g class="va-nu">
      <path class="va-hair" d="M36 62V52A34 32 0 0 1 104 52V62Q104 70 96.5 69C98.5 60 97 52 92.5 46C85 38.5 77 36 70 35.5C63 36 55 38.5 47.5 46C43 52 41.5 60 43.5 69Q36 70 36 62Z"/>
      <path class="va-hair-line" d="M49 36Q57 27 68 25.5"/>
    </g>
    <path class="va-brow" d="M52.5 47.5Q58 45 63.5 47.5M76.5 47.5Q82 45 87.5 47.5"/>
    <path class="va-eyes" d="M52 58Q58 51.5 64 58M76 58Q82 51.5 88 58"/>
    <ellipse class="va-blush" cx="50.5" cy="64.5" rx="6.2" ry="3.6"/>
    <ellipse class="va-blush" cx="89.5" cy="64.5" rx="6.2" ry="3.6"/>
    <path class="va-mouth" d="M64.5 65.5Q70 70.5 75.5 65.5"/>
  </g>
</svg>`;

export function renderAvatarSvg(gender: Gender): string {
  return AVATAR_SVG_TEMPLATE.replace("{{GENDER}}", () => gender);
}
