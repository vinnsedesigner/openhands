import { NavLink } from "react-router";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";
import VyzorixLogo from "#/assets/branding/vyzorix-logo.svg?react";

export function VyzorixLogoButton() {
  return (
    <StyledTooltip content="Vyzorix">
      <NavLink to="/" aria-label="Vyzorix logo">
        <VyzorixLogo width={46} height={30} />
      </NavLink>
    </StyledTooltip>
  );
}
