import { Button } from "@/components/Button"
import { Card, CardHeader, CardTitle, CardBadge, CardBody, CardFooter } from "@/components/Card"
import { Badge } from "@/components/Badge"
import { Alert } from "@/components/Alert"
import { Avatar, AvatarGroup } from "@/components/Avatar"
import { Input, Textarea } from "@/components/Input"

const teamMembers = [
  { name: "Ahmad Rizky" },
  { name: "Budi Santoso" },
  { name: "Clara Dewi" },
  { name: "Dian Pratama" },
  { name: "Eka Surya" },
  { name: "Fajar Nugroho" },
  { name: "Gita Maharani" },
]

const products = [
  { name: "Pro Plan",   price: "$29/mo", badge: "Popular",    color: "blue" as const,   desc: "Untuk tim kecil hingga 10 orang." },
  { name: "Team Plan",  price: "$79/mo", badge: "New",        color: "green" as const,  desc: "Kolaborasi tak terbatas." },
  { name: "Enterprise", price: "Custom", badge: "Contact us", color: "purple" as const, desc: "SLA, SSO, dan dedicated support." },
]

export default function ShowcasePage() {
  return (
    <div>

      <section>
        <h2>Button — cv() variants + compoundVariants</h2>
        <div>
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <br/>
        <div>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
        <br/>
        <div>
          <Button loading>Loading...</Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" size="lg">Outline + Large (compound)</Button>
        </div>
      </section>

      <section>
        <h2>Badge — tw({"{"}base, variants{"}"}) object config</h2>
        <div>
          <Badge>Default</Badge>
          <Badge color="blue">Blue</Badge>
          <Badge color="green" dot>Active</Badge>
          <Badge color="yellow" dot>Pending</Badge>
          <Badge color="red" dot>Error</Badge>
          <Badge color="purple" size="lg">Large Purple</Badge>
        </div>
      </section>

      <section>
        <h2>Alert — cx() conditional merge + dismissible</h2>
        <div>
          <Alert type="info" title="Informasi">
            Komponen ini menggunakan cx() untuk merge class secara kondisional.
          </Alert>
          <Alert type="success" title="Berhasil!" dismissible>
            Data berhasil disimpan. Klik tanda X untuk menutup alert ini.
          </Alert>
          <Alert type="warning" title="Perhatian">
            Sisa kuota API kamu tinggal 10%. Upgrade sekarang.
          </Alert>
          <Alert type="error" title="Terjadi Error" dismissible>
            Gagal memuat data. Silakan coba lagi.
          </Alert>
        </div>
      </section>

      <section>
        <h2>Avatar — tw.server RSC-only + AvatarGroup</h2>
        <div>
          <Avatar name="Ahmad Rizky" size="xs" />
          <Avatar name="Budi Santoso" size="sm" />
          <Avatar name="Clara Dewi" size="md" />
          <Avatar name="Dian Pratama" size="lg" />
          <Avatar name="Eka Surya" size="xl" />
        </div>
        <br/>
        <div>
          <p>AvatarGroup — overflow +N</p>
          <AvatarGroup users={teamMembers} max={4} size="md" />
        </div>
      </section>

      <section>
        <h2>Input + Textarea — tw(Component) extend + error state</h2>
        <div>
          <Input
            label="Email"
            type="email"
            placeholder="hello@example.com"
            hint="Kami tidak akan spam."
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error="Password minimal 8 karakter."
          />
          <Input
            label="Search"
            type="search"
            placeholder="Cari produk..."
            prefix="🔍"
          />
          <Input
            label="Harga"
            type="number"
            placeholder="0"
            prefix="Rp"
            suffix="IDR"
          />
          <div>
            <Textarea
              label="Pesan"
              rows={3}
              placeholder="Tulis pesan kamu di sini..."
              hint="Maksimal 500 karakter."
            />
          </div>
        </div>
      </section>

      <section>
        <h2>Card — tw(Component) extend + komponen komposisi</h2>
        <div>
          {products.map((p) => (
            <Card key={p.name} hoverable>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardBadge>{p.badge}</CardBadge>
              </CardHeader>
              <CardBody>{p.desc}</CardBody>
              <CardFooter>
                <span>{p.price}</span>
                <Button size="sm">Pilih</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

    </div>
  )
}
