"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { userService, FullUserProfile, Address } from "@/services/user.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User,
  MapPin,
  Package,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ChevronRight,
  ShieldCheck,
  Store,
  LogOut,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();

  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit personal info state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Add Address Modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState<"HOME" | "WORK" | "OTHER">("HOME");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrPostalCode, setAddrPostalCode] = useState("");
  const [addrCountry, setAddrCountry] = useState("India");
  const [addrPhone, setAddrPhone] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(true);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressModalError, setAddressModalError] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await userService.getProfile();
      setProfile(data);
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setPhone(data.phone || "");
    } catch (err: any) {
      setProfileErrorMsg(
        err?.response?.data?.error?.message || "Failed to load account profile. Please sign in."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const updated = await userService.updateProfile({
        firstName,
        lastName,
        phone,
      });
      setProfile(updated);
      setUser({
        id: updated._id,
        email: updated.email,
        firstName: updated.firstName,
        lastName: updated.lastName,
        role: updated.role as any,
        status: updated.status,
        isEmailVerified: updated.isEmailVerified,
      });
      setProfileSuccessMsg("Profile details updated successfully!");
    } catch (err: any) {
      setProfileErrorMsg(err?.response?.data?.error?.message || "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrStreet || !addrCity || !addrState || !addrPostalCode) {
      setAddressModalError("Please fill out all required address fields.");
      return;
    }

    setIsAddingAddress(true);
    setAddressModalError(null);

    try {
      const addresses = await userService.addAddress({
        label: addrLabel,
        street: addrStreet,
        city: addrCity,
        state: addrState,
        postalCode: addrPostalCode,
        country: addrCountry,
        phone: addrPhone,
        isDefault: addrIsDefault,
      });

      if (profile) {
        setProfile({ ...profile, addresses });
      }

      setIsAddressModalOpen(false);
      setAddrStreet("");
      setAddrCity("");
      setAddrState("");
      setAddrPostalCode("");
      setAddrPhone("");
    } catch (err: any) {
      setAddressModalError(err?.response?.data?.error?.message || "Failed to add address.");
    } finally {
      setIsAddingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    try {
      const addresses = await userService.setDefaultAddress(addressId);
      if (profile) {
        setProfile({ ...profile, addresses });
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Could not set default address.");
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      const addresses = await userService.deleteAddress(addressId);
      if (profile) {
        setProfile({ ...profile, addresses });
      }
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || "Could not delete address.");
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Sign in Required</h1>
        <p className="mt-2 text-sm text-slate-500">
          Please sign in to access your personal profile and address book.
        </p>
        <Link href="/login" className="inline-block mt-6">
          <Button>Sign In to Account</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 max-w-5xl space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-blue-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-900">Account Settings</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal profile, contact information, and shipping addresses.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/orders">
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5">
              <Package className="h-4 w-4 text-slate-500" />
              <span>My Orders</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Profile */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white uppercase">
                  {user.firstName ? user.firstName[0] : "U"}
                </div>
                <div>
                  <CardTitle className="text-base">
                    {user.firstName} {user.lastName}
                  </CardTitle>
                  <CardDescription className="text-xs">{user.email}</CardDescription>
                  <Badge variant="default" className="mt-1 text-[10px]">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileSuccessMsg && (
                  <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 flex items-center space-x-2 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}
                {profileErrorMsg && (
                  <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 flex items-center space-x-2 border border-rose-200">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700">First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <Input value={user.email} disabled className="mt-1 text-sm bg-slate-100 text-slate-500" />
                  <p className="text-[10px] text-slate-400 mt-0.5">Primary login email cannot be changed</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                  <Input
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>

                <Button type="submit" disabled={isSavingProfile} className="w-full text-xs">
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Role Navigation */}
          {user.role === "SELLER" && (
            <Card className="bg-emerald-50/50 border-emerald-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Store className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Merchant Store</h4>
                    <p className="text-[11px] text-slate-500">Manage products, inventory & payouts</p>
                  </div>
                </div>
                <Link href="/dashboard/seller">
                  <Button size="sm" variant="outline" className="text-xs border-emerald-300">
                    Open
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {user.role === "ADMIN" && (
            <Card className="bg-indigo-50/50 border-indigo-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Admin Control Center</h4>
                    <p className="text-[11px] text-slate-500">Marketplace metrics, KYC, & catalog</p>
                  </div>
                </div>
                <Link href="/dashboard/admin">
                  <Button size="sm" variant="outline" className="text-xs border-indigo-300">
                    Open
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Address Book */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">Saved Delivery Addresses</CardTitle>
                  <CardDescription className="text-xs">
                    Addresses available for one-click checkout across the platform.
                  </CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddressModalOpen(true)}
                className="flex items-center space-x-1 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Address</span>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : !profile?.addresses || profile.addresses.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                  <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-slate-800">No saved addresses yet</h3>
                  <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                    Add your home or office address to enable quick checkout and order tracking.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="mt-4 text-xs"
                  >
                    Add Your First Address
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.addresses.map((addr) => (
                    <div
                      key={addr._id}
                      className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <Badge variant="success" className="text-[10px]">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-900">{addr.street}</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {addr.city}, {addr.state} - {addr.postalCode}
                        </p>
                        <p className="text-[11px] text-slate-500">{addr.country}</p>
                        {addr.phone && (
                          <p className="text-[11px] text-slate-500 mt-1">Phone: {addr.phone}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {!addr.isDefault ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr._id)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Set as default
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Default address</span>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr._id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Remove address"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add New Shipping Address</h3>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addressModalError && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{addressModalError}</span>
              </div>
            )}

            <form onSubmit={handleAddAddress} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Address Label</label>
                <div className="mt-1 flex gap-2">
                  {(["HOME", "WORK", "OTHER"] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddrLabel(lbl)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold border transition-all ${
                        addrLabel === lbl
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Street Address *</label>
                <Input
                  placeholder="Apartment, building, street name"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">City *</label>
                  <Input
                    placeholder="City"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">State *</label>
                  <Input
                    placeholder="State"
                    value={addrState}
                    onChange={(e) => setAddrState(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Postal Code *</label>
                  <Input
                    placeholder="e.g. 560038"
                    value={addrPostalCode}
                    onChange={(e) => setAddrPostalCode(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Country</label>
                  <Input
                    value={addrCountry}
                    onChange={(e) => setAddrCountry(e.target.value)}
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Contact Phone (Optional)</label>
                <Input
                  placeholder="+919876543210"
                  value={addrPhone}
                  onChange={(e) => setAddrPhone(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="addrIsDefault"
                  checked={addrIsDefault}
                  onChange={(e) => setAddrIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="addrIsDefault" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddressModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isAddingAddress}>
                  {isAddingAddress ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    "Save Address"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
