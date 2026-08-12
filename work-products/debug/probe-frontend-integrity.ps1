param(
  [string[]] $Uris = @(
    'https://my-blog.y96hz26c5k.workers.dev/',
    'https://my-blog.y96hz26c5k.workers.dev/api/config',
    'https://uxudjs.github.io/UXUV-Pages/release-manifest.json'
  )
)

$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

function Read-HttpResponse {
  param([Parameter(Mandatory)][string] $Uri)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec 30 -ErrorAction Stop
    return [pscustomobject]@{
      Uri = $Uri
      Status = [int] $response.StatusCode
      Headers = [ordered]@{
        ContentType = $response.Headers['Content-Type']
        ContentLength = $response.Headers['Content-Length']
        RequestId = $response.Headers['X-Request-ID']
        PagesVersion = $response.Headers['X-UXUV-Pages-Version']
        CacheControl = $response.Headers['Cache-Control']
      }
      Body = $response.Content
    }
  } catch {
    $webResponse = $_.Exception.Response
    if ($null -eq $webResponse) {
      return [pscustomobject]@{ Uri = $Uri; Error = $_.Exception.Message }
    }
    $stream = $webResponse.GetResponseStream()
    $reader = [System.IO.StreamReader]::new($stream)
    try {
      $body = $reader.ReadToEnd()
    } finally {
      $reader.Dispose()
      $stream.Dispose()
    }
    return [pscustomobject]@{
      Uri = $Uri
      Status = [int] $webResponse.StatusCode
      Headers = [ordered]@{
        ContentType = $webResponse.Headers['Content-Type']
        ContentLength = $webResponse.Headers['Content-Length']
        RequestId = $webResponse.Headers['X-Request-ID']
        PagesVersion = $webResponse.Headers['X-UXUV-Pages-Version']
        CacheControl = $webResponse.Headers['Cache-Control']
      }
      Body = $body
    }
  }
}

$Uris | ForEach-Object { Read-HttpResponse -Uri $_ } | ConvertTo-Json -Depth 5
