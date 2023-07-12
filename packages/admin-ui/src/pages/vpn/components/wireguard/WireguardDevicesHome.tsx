import React, { useState } from "react";
import { api, useApi } from "api";
import { NavLink } from "react-router-dom";
// Own module
import { maxIdLength, rootPath, subPaths } from "../../data";
import coerceDeviceName from "../../helpers/coerceDeviceName";
// Components
import { confirm } from "components/ConfirmDialog";
import { withToastNoThrow } from "components/toast/Toast";
import Input from "components/Input";
import Card from "components/Card";
import Button from "components/Button";
import { renderResponse } from "components/SwrRender";
import Alert from "react-bootstrap/esm/Alert";
// Icons
import { MdDelete } from "react-icons/md";
import { MAIN_ADMIN_NAME } from "params";
import { urlJoin } from "utils/url";
// Params
import { wireguardDnpName } from "params";
import { rootPath as installedRootPath } from "pages/installer";

export function WireguardDevicesHome() {
  const [input, setInput] = useState("");
  const devicesReq = useApi.wireguardDevicesGet();
  const dnpsRequest = useApi.packagesGet();

  // Actions

  function addDevice(id: string) {
    withToastNoThrow(() => api.wireguardDeviceAdd(id), {
      message: `Adding ${id}...`,
      onSuccess: `Added ${id}`
    }).then(devicesReq.revalidate);
  }

  function removeDevice(id: string) {
    confirm({
      title: `Removing ${id} device`,
      text: "The user using this device will lose access to this DAppNode ",
      label: "Remove",
      onClick: () =>
        withToastNoThrow(() => api.wireguardDeviceRemove(id), {
          message: `Removing ${id}...`,
          onSuccess: `Removed ${id}`
        }).then(devicesReq.revalidate)
    });
  }

  // Input errors
  const errors: string[] = [];
  if (input.length > maxIdLength)
    errors.push(`Device name must be shorter than {maxIdLength} characters`);

  // If the wireguard package is not installed, invite the user to install it
  if (dnpsRequest.data) {
    const wireguardDnp = dnpsRequest.data.find(
      dnp => dnp.dnpName === wireguardDnpName
    );
    if (!wireguardDnp) {
      const url = `${installedRootPath}/${wireguardDnpName}`;
      return (
        <Alert variant="secondary">
          You must <NavLink to={url}>install the Wireguard package</NavLink> to
          use this feature
        </Alert>
      );
    }
  }

  return (
    <>
      <Input
        placeholder="Device's unique name"
        value={input}
        // Ensure id contains only alphanumeric characters
        onValueChange={value => setInput(coerceDeviceName(value))}
        onEnterPress={() => {
          addDevice(input);
          setInput("");
        }}
        append={
          <Button onClick={() => addDevice(input)} disabled={errors.length > 0}>
            Add device
          </Button>
        }
      />

      {errors.map(error => (
        <div className="color-danger">{error}</div>
      ))}

      {renderResponse(devicesReq, ["Loading devices"], data => (
        <Card className="list-grid wireguard">
          <header>Name</header>
          <header className="center">Credentials</header>
          <header>Remove</header>
          {[...data]
            // Sort main admin device as first
            .sort(d1 => (d1 === MAIN_ADMIN_NAME ? -1 : 0))
            .map(id => (
              <React.Fragment key={id}>
                <div className="name">{id}</div>
                <NavLink
                  to={urlJoin(rootPath, subPaths.wireguard, id)}
                  className="no-a-style"
                >
                  <Button className="get-link">Get</Button>
                </NavLink>

                <MdDelete onClick={() => removeDevice(id)} />
                <hr />
              </React.Fragment>
            ))}
        </Card>
      ))}
    </>
  );
}
