/**
 * Handle rendering of each badge and all badges.
 */
import { SHIELDS_BADGE, SHIELDS_STATIC } from "./constants";

// TODO combine link/target functions in a module.
export function markdownLink(altText: string, linkTarget: string) {
  return `[${altText}](${linkTarget})`;
}

export function markdownImage(
  altText: string,
  imageTarget: string,
  hoverTitle = ""
) {
  if (hoverTitle) {
    imageTarget = `${imageTarget} "${hoverTitle}"`;
  }
  return `![${altText}](${imageTarget})`;
}

// TODO: Add pre-label as social badges have.
export function markdownImageWithLink(
  altText: string,
  imageTarget: string,
  linkTarget = "",
  hoverTitle = ""
) {
  const image = markdownImage(altText, imageTarget, hoverTitle);

  if (linkTarget) {
    return markdownLink(image, linkTarget);
  }
  return image;
}

/**
 * Replace dashes, underscores and spaces to match shields.io API format.
 *
 * Spaces are converted to underscores - so if you pass the result to an encode functions they won't become '%20'.
 */
export function _encodeSeparators(value: string, spaceToUnderscore: boolean) {
  value = value.replace(/-/g, "--").replace(/_/g, "__");

  if (spaceToUnderscore) {
    value = value.replace(/ /g, "_");
  }

  return value;
}

/**
 * Turn URL-encoded '<' and '>' back into characters.
 */
export function _decodeAngleBrackets(value: string) {
  return value.replace(/%3E/g, ">").replace(/%3C/g, "<");
}

/**
 * Encode a value to be safe as a param in a URL.
 *
 * See badges.spec.ts for cases.
 *
 * Prepare a value for dash-based shields.io API based on notes on that site.
 *
 * Note the shields.io API itself does funny things if you do use more than one
 * occurence of dash and space or underscore and space when this is escaped correctly.
 * e.g. 'A - B - C' converted to 'A_--_B_--_C' unfortunately renders in the SVG result 'A - B_- C'.
 * So just don't mix them and you'll be ok. Like do 'A-B-C'.
 */
export function encodeParam(value: string, spaceToUnderscore = true) {
  value = _encodeSeparators(value, spaceToUnderscore);

  const encoded = encodeURIComponent(value);

  return _decodeAngleBrackets(encoded);
}

/**
 * Serialize a URL from query params.
 *
 * Note the URL must have a protocal or it will be considered invalid. Any empty values get
 * dropped to keep the result short.
 *
 * The URL types's API performs encoding, so at the end we must reverse this so the result works for badges.
 */
export function buildUrl(
  urlStr: string,
  params: { [key: string]: string }
): string {
  let url = new URL(urlStr);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.append(key, value);
    }
  }

  return decodeURI(url.href);
}

function formatTitle(label: string, message: string) {
  return label ? [label, message].join(" - ") : message;
}

/**
 * Prepare path for shields.io dash-based API.
 *
 * The API requires MESSAGE-COLOR at the least and also accepts LABEL-MESSAGE-COLOR.
 *
 * This appropriately escapes label and message for you, based on notes on the shields.io website.
 * So you can pass in more readable values.
 */
function dashShieldPath(message: string, color: string, label?: string) {
  message = encodeParam(message);

  let pieces = [message, color];
  if (label) {
    label = encodeParam(label);
    pieces.unshift(label);
  }

  return pieces.join("-");
}

/**
 * Generate parametes to style a badge.
 *
 * Return as key-value pairs with appropriate size (large or standard) and optional logo.
 */
export function logoParams(isLarge = false, logo?: string, logoColor?: string) {
  let params: { [key: string]: string } = {};

  if (isLarge) {
    params.style = "for-the-badge";
  }

  if (logo) {
    params.logo = logo;

    if (logoColor) {
      params.logoColor = logoColor;
    }
  }

  return params;
}

interface GenericBadge {
  label: string;
  message: string;
  color: string;
  styleParams: { [key: string]: string };
}

// TODO: Move business logic for specific badges to separate module from general markdown and URL handling.
/** Image URL for param-based static badge. */
function staticParamsUrl({ label, message, color, styleParams }: GenericBadge) {
  const params = { label, message, color, ...styleParams };

  return buildUrl(SHIELDS_STATIC, params);
}

/** Image URL for dash-based static badge. */
function staticDashUrl({ label, message, color, styleParams }: GenericBadge) {
  const imgPath = dashShieldPath(message, color, label),
    imgUrl = `${SHIELDS_BADGE}/${imgPath}`;

  return buildUrl(imgUrl, styleParams);
}

// TODO: Split on the badge and the target as functions then combine them in a higher function like this.
/**
 * Generate markdown for generic badge.
 *
 * Everything is optional except message.
 *
 * In the dash style, the result is LABEL-MESSAGE-COLOR or MESSABE-COLOR. The API needs color to be
 * set, so this is made a required param here on this function.
 * Sample URL: https://img.shields.io/badge/Foo-Bar--Baz-green
 *
 * Use the params style by setting onlyQueryParams to be true. The result is more verbose but does
 * not require escaping characters. Sample:
 * https://img.shields.io/static/v1?label=MichaelCurrin&message=badge-generator&logo=github&color=blue
 */
export function genericBadge(
  label = "",
  message: string,
  color: string,
  isLarge = false,
  target = "",
  logo = "",
  logoColor = "",
  onlyQueryParams = false
) {
  const title = formatTitle(label, message);

  const styleParams = logoParams(isLarge, logo, logoColor),
    badgeFields = { label, message, color, styleParams };

  const fullImgUrl = onlyQueryParams
    ? staticParamsUrl(badgeFields)
    : staticDashUrl(badgeFields);

  return markdownImageWithLink(title, fullImgUrl, target);
}
