# Yalidine API (Compact AI Reference)

## Authentication

All requests require these HTTP headers:

```http
X-API-ID: <API_ID>
X-API-TOKEN: <API_TOKEN>
```

Example:

```http
X-API-ID: 94986571734304520846
X-API-TOKEN: 5MKfvcyQtO3eouL6tDv0VDFhUT8Sc7w5
```

---

# Create Parcel

**Endpoint**

```http
POST /v1/parcels
```

## Required Body

| Field | Type | Notes |
|------|------|------|
| order_id | string | Unique per parcel. Used to map response to original order. |
| from_wilaya_name | string | Valid wilaya name. |
| firstname | string | Receiver first name. |
| familyname | string | Receiver last name. |
| contact_phone | string | Starts with `0`. Mobile: 10 digits (e.g. `0550123456`). Landline: 9 digits (e.g. `023456789`). Multiple numbers separated by commas. |
| address | string | Receiver address. |
| to_commune_name | string | Valid commune name. |
| to_wilaya_name | string | Valid wilaya name. |
| product_list | string | Parcel contents description. |
| Price | integer | Cash to collect. Range: `0-150000`. |
| do_insurance | boolean | Whether insurance is enabled. |
| declared_value | integer | Parcel declared value. Range: `0-150000`. |
| Length | integer | Length (cm). `>=0`. |
| Width | integer | Width (cm). `>=0`. |
| Height | integer | Height (cm). `>=0`. |
| Weight | integer | Weight. `>=0`. |
| freeshipping | boolean | `true`: sender pays shipping. `false`: receiver pays. |
| is_stopdesk | boolean | `true`: stop desk delivery. `false`: home delivery. |
| has_exchange | boolean | Whether exchange is requested. |

## Conditional Fields

| Field | Required When | Notes |
|------|------|------|
| stopdesk_id | `is_stopdesk == true` | Stop desk center ID. |
| product_to_collect | `has_exchange == true` | Description of returned product. |

---

## Success / Failure Response

Response is keyed by `order_id`.

```json
{
  "MyFirstOrder": {
    "success": true,
    "order_id": "MyFirstOrder",
    "tracking": "yal-12345A",
    "import_id": 234,
    "label": "https://...",
    "labels": "https://...",
    "message": ""
  },
  "MySecondOrder": {
    "success": false,
    "order_id": "MySecondOrder",
    "tracking": null,
    "import_id": null,
    "label": null,
    "labels": null,
    "message": "The do_insurance parameter must be of type boolean"
  }
}
```

Important response fields:

- `success` → operation result.
- `tracking` → parcel tracking number.
- `import_id` → batch import identifier.
- `label` → single parcel label URL.
- `labels` → batch labels URL.
- `message` → validation/error message.

---

# Delete Parcel

A parcel can only be deleted while its latest status is **"en préparation"**.

## Method 1

Delete a single parcel.

```http
DELETE /v1/parcels/{tracking}
```

Example

```http
DELETE /v1/parcels/yal-123456
```

---

## Method 2

Delete one or multiple parcels.

```http
DELETE /v1/parcels/?tracking=yal-123456,yal-789102
```

### Query Parameter

| Field | Type | Notes |
|------|------|------|
| tracking | string | Required for Method 2. Comma-separated tracking numbers. |

---

# Parcel History

Retrieve tracking history.

```http
GET /v1/histories
```

Retrieve history for a single parcel.

```http
GET /v1/histories/{tracking}
```

---

# Notes

- Every request must include `X-API-ID` and `X-API-TOKEN`.
- `order_id` must be unique for every parcel submitted.
- `stopdesk_id` is mandatory only when `is_stopdesk` is `true`.
- `product_to_collect` is mandatory only when `has_exchange` is `true`.
- `Price` and `declared_value` must be between `0` and `150000`.
- Dimensions and weight must be non-negative integers.
- Phone numbers must follow the specified Algerian formats.
- Valid wilaya and commune names must match Yalidine's accepted values.

---

# Parcel History

Retrieve parcel tracking history.

## Endpoints

Get history for all parcels:

```http
GET /v1/histories
```

Get history for a specific parcel:

```http
GET /v1/histories/{tracking}
```

Example:

```http
GET /v1/histories/yal-123456
```

Retrieve multiple parcels by tracking:

```http
GET /v1/histories/?tracking=yal-123456,yal-789123,yal-456789
```

---

## Query Filters

Filters can be combined freely.

### Examples

Delivered parcels only:

```http
GET /v1/histories/?status=Livré
```

Delivered history for a specific parcel:

```http
GET /v1/histories/?status=Livré&tracking=yal-123456
```

Delivered history for multiple parcels:

```http
GET /v1/histories/?status=Livré&tracking=yal-123456,yal-789123
```

> Multiple values can be supplied for the same filter using commas, except date filters.

---

## Supported Filters

| Parameter | Type | Notes |
|-----------|------|------|
| tracking | string | One or multiple tracking numbers (comma separated). |
| status | string | Parcel status. |
| date_status | string | `YYYY-MM-DD` or `YYYY-MM-DD,YYYY-MM-DD` for range. |
| reason | string | Delivery failure or hold reason. |
| fields | string | Comma-separated list of returned fields. |
| page | integer | Page number. |
| page_size | integer | Results per page. |
| order_by | string | Sort field (see below). |
| asc | flag | Ascending order. No value required. |
| desc | flag | Descending order. No value required. |

### order_by values

- date_status
- tracking
- status
- reason

Example:

```http
GET /v1/histories/?order_by=tracking&asc
```

---

## Status Values

Valid `status` values:

- Pas encore expédié
- A vérifier
- En préparation
- Pas encore ramassé
- Prêt à expédier
- En passation
- Ramassé
- Bloqué
- Débloqué
- Transfert
- Expédié
- Centre
- En localisation
- Vers Wilaya
- En transit
- Reçu à Wilaya
- En attente du client
- Prêt pour livreur
- Sorti en livraison
- En attente
- Annulé
- En alerte
- Alerte résolue
- Tentative échouée
- Livré
- Echèc livraison
- Retour vers centre
- Retourné au centre
- Retour transfert
- Retour groupé
- Retour à retirer
- Retour vers vendeur
- Retourné au vendeur
- Echange échoué

---

## Reason Values

Delivery failure reasons:

- Téléphone injoignable
- Client ne répond pas
- Faux numéro
- Client absent (reporté)
- Client absent (échoué)
- Annulé par le client
- Commande double
- Le client n'a pas commandé
- Produit erroné
- Produit manquant
- Produit cassé ou défectueux
- Client incapable de payer
- Wilaya erronée
- Commune erronée
- Client no-show
- Adresse non livrable

Parcel hold reasons:

- Document manquant
- Produit interdit
- Produit dangereux
- Fausse déclaration

---

## Field Selection

By default the API returns a standard set of fields.

Specify only the fields you need:

```http
GET /v1/histories/?fields=tracking,status
```

Available fields:

| Field | Type |
|------|------|
| tracking | string |
| date_status | datetime |
| status | string |
| reason | string |
| center_id | integer |
| center_name | string |
| wilaya_id | integer |
| wilaya_name | string |
| commune_id | integer |
| commune_name | string |

---

## Notes

- Multiple values in the same filter are comma-separated.
- Date filters accept either a single date or a date range.
- Default ordering is `date_status DESC`.